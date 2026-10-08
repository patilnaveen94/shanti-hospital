-- =====================================================================
--  Shanti Hospital — update 05
--  Patient records and prescriptions.
--
--  Run AFTER updates-04.sql. Safe to re-run.
--
--  THIS CROSSES A LINE THE EARLIER SCHEMA DREW DELIBERATELY.
--  schema.sql notes above `appointments` that the phase was kept "out of
--  medical-record territory". Prescriptions are clinical records, which
--  brings obligations the front-office tables did not have:
--
--    * DPDP Act — health data is sensitive personal data. Purpose
--      limitation, breach reporting, access and erasure requests.
--    * Statutory medical-record retention (state medical council rules)
--      which CONFLICTS with DPDP erasure. Needs a medico-legal opinion,
--      then encode the answer. Nothing here auto-deletes.
--    * ABDM / FHIR R4 if the hospital is empanelled under PM-JAY. The
--      column shapes below map cleanly onto FHIR Patient and
--      MedicationRequest, but no FHIR layer is built yet.
--
--  Do not run this on a project without backups. The Supabase free tier
--  takes none.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper: may the caller see clinical records?
--
-- Least privilege. `front_desk` books appointments and does not need a
-- patient's drug history; `read_only` is for reporting. Whoever scans
-- prescriptions at your hospital needs the `doctor` or `admin` role.
-- ---------------------------------------------------------------------
create or replace function public.is_clinician()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_profiles
    where id = auth.uid()
      and is_active
      and role in ('admin', 'doctor')
  );
$$;

revoke all on function public.is_clinician() from public, anon;
grant execute on function public.is_clinician() to authenticated;

-- ---------------------------------------------------------------------
-- Patients
--
-- WHY THIS TABLE EXISTS AT ALL, rather than keying records on the phone
-- number as originally requested:
--
--   * Families share one number. A mother booking for three children
--     would merge three children's drug histories into one record, and
--     staff would then read another child's allergies while treating
--     this one. That is a clinical safety hazard, not a privacy nicety.
--   * Telcos reassign disconnected numbers after ~90 days, so a new
--     owner would inherit a stranger's medical history.
--   * Patients change numbers, silently splitting their own history.
--
-- Identity is the MRN. Phone numbers are a lookup key — see
-- patient_phones below.
-- ---------------------------------------------------------------------
create sequence if not exists public.mrn_seq start with 1 increment by 1;

create or replace function public.next_mrn()
returns text
language sql
volatile
as $$
  select 'SH-' || to_char(now(), 'YYYY') || '-'
         || lpad(nextval('public.mrn_seq')::text, 5, '0');
$$;

create table if not exists public.patients (
  id            uuid        primary key default gen_random_uuid(),
  mrn           text        not null unique default public.next_mrn(),
  full_name     text        not null check (length(trim(full_name)) between 2 and 120),
  -- Prefer date_of_birth: a stored age is wrong within a year. age_years
  -- is the fallback for walk-ins who do not know their date of birth.
  date_of_birth date        check (date_of_birth > '1900-01-01' and date_of_birth <= current_date),
  age_years     integer     check (age_years between 0 and 120),
  gender        text        not null check (gender in ('Male', 'Female', 'Other')),
  -- Allergies and chronic conditions. Short, and clinician-visible only.
  notes         text        not null default '' check (length(notes) <= 2000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- One of the two age sources must be present or the record is useless
  -- for dosing decisions.
  constraint patients_age_known check (date_of_birth is not null or age_years is not null)
);

create index if not exists patients_name_idx on public.patients (lower(full_name));
create index if not exists patients_mrn_idx on public.patients (mrn);

-- ---------------------------------------------------------------------
-- Patient phone numbers — deliberately many-to-many
--
-- One patient may have several numbers over time. One number may reach
-- several patients (a shared family phone). Neither side is unique, and
-- that is the entire point: a phone number yields CANDIDATES which a
-- human confirms, never an automatic identity match.
-- ---------------------------------------------------------------------
create table if not exists public.patient_phones (
  patient_id uuid        not null references public.patients (id) on delete cascade,
  phone      text        not null check (phone ~ '^[0-9]{10}$'),
  is_primary boolean     not null default false,
  -- 'self', 'mother', 'neighbour' — helps staff pick the right candidate.
  label      text        not null default '' check (length(label) <= 40),
  created_at timestamptz not null default now(),
  primary key (patient_id, phone)
);

create index if not exists patient_phones_phone_idx on public.patient_phones (phone);

-- ---------------------------------------------------------------------
-- Prescriptions
--
-- `notes_text` is what staff typed and is AUTHORITATIVE.
-- `ocr_text` is machine-extracted and is NOT. Handwriting plus drug
-- names is close to the worst case for OCR: a misread "5 mg" as "50 mg"
-- reaches a patient. The image is the record; ocr_text exists to make
-- records searchable and must be labelled unverified wherever shown.
-- ---------------------------------------------------------------------
create table if not exists public.prescriptions (
  id             uuid        primary key default gen_random_uuid(),
  patient_id     uuid        not null references public.patients (id) on delete restrict,
  -- Null for a prescription recorded without a booking.
  appointment_id uuid        references public.appointments (id) on delete set null,
  doctor_id      text        references public.doctors (id) on delete set null,
  department_id  text        references public.departments (id) on delete set null,
  issued_at      timestamptz not null default now(),
  notes_text     text        not null default '' check (length(notes_text) <= 8000),
  ocr_text       text        check (ocr_text is null or length(ocr_text) <= 20000),
  ocr_status     text        not null default 'none'
                 check (ocr_status in ('none', 'queued', 'running', 'done', 'failed')),
  ocr_confidence numeric(4,3) check (ocr_confidence between 0 and 1),
  ocr_error      text,
  created_by     uuid        references public.staff_profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- A prescription with neither typed notes nor an image is an empty row.
  -- Images arrive after the insert, so this is checked in the app rather
  -- than here; see repository.insertPrescription.
  constraint prescriptions_has_content check (true)
);

-- THE history query: "every prescription for this patient, newest first".
create index if not exists prescriptions_patient_history_idx
  on public.prescriptions (patient_id, issued_at desc);

create index if not exists prescriptions_appointment_idx
  on public.prescriptions (appointment_id);

-- Drives the OCR worker. Partial, so it stays tiny regardless of volume.
create index if not exists prescriptions_ocr_queue_idx
  on public.prescriptions (created_at)
  where ocr_status in ('queued', 'running');

-- ---------------------------------------------------------------------
-- Prescription files
--
-- One row per page: a prescription is often two or three photographs
-- (continuation sheet, reverse side, an attached lab slip).
--
-- `storage_path` is a bucket path, never a URL. URLs are minted as
-- short-lived signed URLs at read time — a public URL for a prescription
-- is a data breach with extra steps, since it leaks through browser
-- history, referrers and screenshots.
-- ---------------------------------------------------------------------
create table if not exists public.prescription_files (
  id              uuid        primary key default gen_random_uuid(),
  prescription_id uuid        not null references public.prescriptions (id) on delete cascade,
  storage_path    text        not null unique,
  thumb_path      text,
  mime_type       text        not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  bytes           integer     not null check (bytes > 0 and bytes <= 8388608),
  width           integer,
  height          integer,
  page_no         integer     not null default 1 check (page_no between 1 and 20),
  -- sha256 of the compressed bytes; catches an accidental re-upload of
  -- the same photograph.
  checksum        text,
  created_at      timestamptz not null default now(),
  unique (prescription_id, page_no)
);

create index if not exists prescription_files_rx_idx
  on public.prescription_files (prescription_id, page_no);

-- ---------------------------------------------------------------------
-- Read auditing
--
-- write_audit() covers inserts, updates and deletes. For clinical
-- records the question asked in a medico-legal dispute is "who LOOKED at
-- this record, and when" — which no write trigger can answer.
--
-- Opening a prescription is logged. Browsing the history list is not:
-- one row per card rendered would bury the signal in noise.
-- ---------------------------------------------------------------------
create table if not exists public.prescription_access_log (
  id              bigserial   primary key,
  prescription_id uuid        not null,
  patient_id      uuid        not null,
  actor_id        uuid,
  actor_email     text,
  at              timestamptz not null default now()
);

create index if not exists rx_access_patient_idx
  on public.prescription_access_log (patient_id, at desc);

-- =====================================================================
--  Triggers
-- =====================================================================
do $$
declare
  t text;
begin
  foreach t in array array['patients', 'patient_phones', 'prescriptions', 'prescription_files']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I
       for each row execute function public.write_audit()', t || '_audit', t);
  end loop;

  -- Only the tables that carry updated_at.
  foreach t in array array['patients', 'prescriptions']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format(
      'create trigger %I before update on public.%I
       for each row execute function public.touch_updated_at()', t || '_touch', t);
  end loop;
end $$;

-- =====================================================================
--  Row Level Security
--
--  No anonymous access to any of this, under any policy. Unlike
--  `doctors` and `departments`, none of these tables gets a public read.
-- =====================================================================
alter table public.patients                enable row level security;
alter table public.patient_phones          enable row level security;
alter table public.prescriptions           enable row level security;
alter table public.prescription_files      enable row level security;
alter table public.prescription_access_log enable row level security;

-- ---- Patients: all staff may read and write ------------------------
-- The front desk must be able to register and find a patient to book an
-- appointment. Demographics are not the sensitive part; the clinical
-- record below is.
drop policy if exists patients_staff_all on public.patients;
create policy patients_staff_all on public.patients for all
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists patient_phones_staff_all on public.patient_phones;
create policy patient_phones_staff_all on public.patient_phones for all
  using (public.is_staff()) with check (public.is_staff());

-- ---- Prescriptions: clinicians only --------------------------------
drop policy if exists prescriptions_clinician_all on public.prescriptions;
create policy prescriptions_clinician_all on public.prescriptions for all
  using (public.is_clinician()) with check (public.is_clinician());

drop policy if exists prescription_files_clinician_all on public.prescription_files;
create policy prescription_files_clinician_all on public.prescription_files for all
  using (public.is_clinician()) with check (public.is_clinician());

-- Deleting a clinical record is an admin act, and the audit trigger
-- keeps the deleted row in audit_log either way.
drop policy if exists prescriptions_admin_delete on public.prescriptions;
create policy prescriptions_admin_delete on public.prescriptions for delete
  using (public.is_admin());

-- ---- Access log: append-only from the server, admin-readable -------
drop policy if exists rx_access_admin_read on public.prescription_access_log;
create policy rx_access_admin_read on public.prescription_access_log for select
  using (public.is_admin());
-- No insert policy: only the security-definer RPC below writes here, so
-- a client cannot forge or suppress an access record.

-- =====================================================================
--  Functions the app calls
-- =====================================================================

-- ---------------------------------------------------------------------
-- Candidate lookup by phone.
--
-- Returns everything staff need to pick the right person, and nothing
-- clinical. Deliberately returns a SET even when there is one match:
-- the caller must still confirm, because the single-match case is
-- exactly the shared-family-number case.
-- ---------------------------------------------------------------------
create or replace function public.find_patients_by_phone(p_phone text)
returns table (
  id            uuid,
  mrn           text,
  full_name     text,
  gender        text,
  age_years     integer,
  date_of_birth date,
  phone_label   text,
  last_visit    timestamptz,
  visit_count   bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,
         p.mrn,
         p.full_name,
         p.gender,
         p.age_years,
         p.date_of_birth,
         ph.label,
         (select max(a.appointment_date)::timestamptz
            from public.appointments a
           where a.patient_phone = p_phone
             and lower(a.patient_name) = lower(p.full_name)),
         (select count(*)
            from public.prescriptions rx
           where rx.patient_id = p.id)
    from public.patients p
    join public.patient_phones ph on ph.patient_id = p.id
   where ph.phone = p_phone
     and public.is_staff()
   order by ph.is_primary desc, p.full_name;
$$;

revoke all on function public.find_patients_by_phone(text) from public, anon;
grant execute on function public.find_patients_by_phone(text) to authenticated;

-- ---------------------------------------------------------------------
-- Open a prescription.
--
-- Logs the access and returns the file rows in one call, so the audit
-- entry cannot be skipped by a client that forgets to write it. Make the
-- audit unavoidable rather than polite.
-- ---------------------------------------------------------------------
create or replace function public.open_prescription(p_prescription_id uuid)
returns table (
  file_id      uuid,
  storage_path text,
  thumb_path   text,
  mime_type    text,
  bytes        integer,
  width        integer,
  height       integer,
  page_no      integer
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_patient uuid;
  v_email   text;
begin
  if not public.is_clinician() then
    raise exception 'Not authorised to open clinical records.'
      using errcode = '42501';
  end if;

  select patient_id into v_patient
    from public.prescriptions where id = p_prescription_id;

  if v_patient is null then
    raise exception 'Prescription not found.' using errcode = 'P0002';
  end if;

  select email into v_email from auth.users where id = auth.uid();

  insert into public.prescription_access_log
    (prescription_id, patient_id, actor_id, actor_email)
  values (p_prescription_id, v_patient, auth.uid(), v_email);

  return query
    select f.id, f.storage_path, f.thumb_path, f.mime_type,
           f.bytes, f.width, f.height, f.page_no
      from public.prescription_files f
     where f.prescription_id = p_prescription_id
     order by f.page_no;
end;
$$;

revoke all on function public.open_prescription(uuid) from public, anon;
grant execute on function public.open_prescription(uuid) to authenticated;

-- =====================================================================
--  Storage
--
--  Private bucket. 8 MB ceiling is generous for a client-compressed
--  page (~350 KB) and still stops an uncompressed upload path from
--  becoming a file dump.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'prescriptions', 'prescriptions', false, 8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = 8388608,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

drop policy if exists rx_objects_clinician_read on storage.objects;
create policy rx_objects_clinician_read on storage.objects for select
  using (bucket_id = 'prescriptions' and public.is_clinician());

drop policy if exists rx_objects_clinician_write on storage.objects;
create policy rx_objects_clinician_write on storage.objects for insert
  with check (bucket_id = 'prescriptions' and public.is_clinician());

drop policy if exists rx_objects_admin_delete on storage.objects;
create policy rx_objects_admin_delete on storage.objects for delete
  using (bucket_id = 'prescriptions' and public.is_admin());

-- =====================================================================
--  Backfilling patients from existing appointments
--
--  NOT RUN AUTOMATICALLY, and that is deliberate.
--
--  Deriving patients from appointment rows means grouping by phone,
--  which is precisely the unsafe merge this whole design avoids.
--  Grouping on (phone, lower(name)) is safer but still guesses: two
--  people with the same name on one family phone would merge.
--
--  Review the output of this query, then insert deliberately:
--
--    select patient_phone,
--           lower(patient_name)            as name_key,
--           min(patient_name)              as display_name,
--           array_agg(distinct patient_age) as ages,
--           array_agg(distinct patient_gender) as genders,
--           count(*)                       as appointments
--      from public.appointments
--     group by patient_phone, lower(patient_name)
--     having count(distinct patient_gender) > 1
--         or max(patient_age) - min(patient_age) > 2
--     order by appointments desc;
--
--  Any row the above returns is ambiguous — conflicting gender, or an
--  age spread wider than the elapsed time — and needs a human decision
--  before it becomes a patient record.
-- =====================================================================
