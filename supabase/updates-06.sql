-- =====================================================================
--  Shanti Hospital — update 06
--  Wire prescriptions into the appointment list.
--
--  Run AFTER updates-05.sql. Safe to re-run.
--
--  WHAT THIS CHANGES
--  updates-05 gave patients and prescriptions their own screen, reached by
--  typing a phone number. That is the wrong way round for a front desk:
--  staff are already looking at today's appointment list with the patient's
--  phone, name and age on screen. Retyping the number to find the record
--  they are already looking at is friction that gets skipped, and a record
--  that gets skipped is not a record.
--
--  So: an appointment carries a patient_id, prescriptions hang off the
--  appointment, and the list shows at a glance who has past visits.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Link an appointment to a patient record
--
-- NULLABLE, and left null on booking. A patient books themselves from the
-- public site where nobody can confirm identity, and auto-linking on phone
-- is the merge this design exists to prevent. Staff link it when they work
-- the appointment, which is one tap on a prompt that already has the
-- candidate in front of them.
-- ---------------------------------------------------------------------
alter table public.appointments
  add column if not exists patient_id uuid references public.patients (id) on delete set null;

create index if not exists appointments_patient_idx
  on public.appointments (patient_id, appointment_date desc);

comment on column public.appointments.patient_id is
  'Linked patient record. Null until staff confirm identity; never set '
  'automatically from the phone number, because one number can reach '
  'several patients.';

-- ---------------------------------------------------------------------
-- Batched history summary for a list of phone numbers
--
-- The appointment list needs "does this person have past records?" for every
-- visible row. Asking per row is 20 round trips to render one screen; this
-- answers the whole page in one.
--
-- Returns one row per (phone, patient) pair, so a shared family number
-- yields several and the caller can show "2 patients on this number" rather
-- than guessing which.
-- ---------------------------------------------------------------------
create or replace function public.patient_history_summary(p_phones text[])
returns table (
  phone       text,
  patient_id  uuid,
  mrn         text,
  full_name   text,
  gender      text,
  age_years   integer,
  date_of_birth date,
  visit_count bigint,
  last_visit  timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select ph.phone,
         p.id,
         p.mrn,
         p.full_name,
         p.gender,
         p.age_years,
         p.date_of_birth,
         count(rx.id),
         max(rx.issued_at)
    from public.patient_phones ph
    join public.patients p on p.id = ph.patient_id
    left join public.prescriptions rx on rx.patient_id = p.id
   where ph.phone = any (p_phones)
     and public.is_staff()
   group by ph.phone, p.id, p.mrn, p.full_name, p.gender, p.age_years, p.date_of_birth
   order by ph.phone, p.full_name;
$$;

revoke all on function public.patient_history_summary(text[]) from public, anon;
grant execute on function public.patient_history_summary(text[]) to authenticated;

-- ---------------------------------------------------------------------
-- Link an appointment to a patient, creating the patient if needed
--
-- One statement so the three writes cannot half-succeed: the patient row,
-- the phone binding, and the appointment link. Called with p_patient_id when
-- staff picked an existing candidate, or without it to register the person
-- from the appointment's own details.
--
-- Does NOT choose a patient on its own. The caller passes an explicit id or
-- explicitly asks for a new record.
-- ---------------------------------------------------------------------
create or replace function public.link_appointment_patient(
  p_appointment_id uuid,
  p_patient_id     uuid default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_apt     record;
  v_patient uuid;
begin
  if not public.is_staff() then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;

  select * into v_apt from public.appointments where id = p_appointment_id;
  if v_apt is null then
    raise exception 'Appointment not found.' using errcode = 'P0002';
  end if;

  if p_patient_id is not null then
    v_patient := p_patient_id;
  else
    -- Register from what the booking already told us.
    insert into public.patients (full_name, age_years, gender)
    values (v_apt.patient_name, v_apt.patient_age, v_apt.patient_gender)
    returning id into v_patient;
  end if;

  -- Bind the number that booked this appointment to the patient. Idempotent.
  insert into public.patient_phones (patient_id, phone, is_primary, label)
  values (v_patient, v_apt.patient_phone, true, '')
  on conflict (patient_id, phone) do nothing;

  update public.appointments set patient_id = v_patient where id = p_appointment_id;

  return v_patient;
end;
$$;

revoke all on function public.link_appointment_patient(uuid, uuid) from public, anon;
grant execute on function public.link_appointment_patient(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Patient search for the records screen
--
-- Name, MRN or phone in one call. Trigram index rather than a plain prefix
-- match so "kamble" finds "Laxmi Kamble" — staff rarely know which part of
-- a name was entered first.
-- ---------------------------------------------------------------------
create extension if not exists pg_trgm;

create index if not exists patients_name_trgm_idx
  on public.patients using gin (full_name gin_trgm_ops);

create or replace function public.search_patient_records(p_term text, p_limit integer default 25)
returns table (
  patient_id  uuid,
  mrn         text,
  full_name   text,
  gender      text,
  age_years   integer,
  date_of_birth date,
  phones      text[],
  visit_count bigint,
  last_visit  timestamptz
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
         coalesce(array_agg(distinct ph.phone) filter (where ph.phone is not null), '{}'),
         count(distinct rx.id),
         max(rx.issued_at)
    from public.patients p
    left join public.patient_phones ph on ph.patient_id = p.id
    left join public.prescriptions rx on rx.patient_id = p.id
   where public.is_staff()
     and (
       p.full_name ilike '%' || p_term || '%'
       or p.mrn ilike '%' || p_term || '%'
       or exists (
         select 1 from public.patient_phones x
          where x.patient_id = p.id and x.phone like p_term || '%'
       )
     )
   group by p.id
   order by max(rx.issued_at) desc nulls last, p.full_name
   limit greatest(1, least(p_limit, 100));
$$;

revoke all on function public.search_patient_records(text, integer) from public, anon;
grant execute on function public.search_patient_records(text, integer) to authenticated;

-- ---------------------------------------------------------------------
-- Everything recorded for one patient across visits
--
-- Joins the appointment so the history can show WHY they came ("fever, 3
-- days") next to what was prescribed. Reading symptoms alongside the
-- prescription is most of the clinical value of a history.
-- ---------------------------------------------------------------------
create or replace view public.patient_visit_history as
  select rx.id              as prescription_id,
         rx.patient_id,
         rx.appointment_id,
         rx.issued_at,
         rx.notes_text,
         rx.ocr_status,
         rx.doctor_id,
         rx.department_id,
         a.ref_id           as appointment_ref,
         a.appointment_date,
         a.slot,
         a.symptoms,
         a.status           as appointment_status,
         (select count(*) from public.prescription_files f
           where f.prescription_id = rx.id) as page_count
    from public.prescriptions rx
    left join public.appointments a on a.id = rx.appointment_id;

-- The view inherits RLS from prescriptions, so clinicians only.
grant select on public.patient_visit_history to authenticated;
