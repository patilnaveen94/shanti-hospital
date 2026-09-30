-- =====================================================================
--  Shanti Hospital — database schema
--  Target: Supabase / PostgreSQL 15+  (region: ap-south-1 Mumbai)
--
--  Run this once in the Supabase SQL editor on a new project.
--  Safe to re-run: every statement is guarded.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Staff accounts
--
-- Supabase Auth owns credentials in auth.users. This table holds the
-- hospital-specific role, so authorisation never depends on client state.
-- ---------------------------------------------------------------------
create table if not exists public.staff_profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text        not null default '',
  role        text        not null default 'front_desk'
              check (role in ('admin', 'front_desk', 'doctor', 'read_only')),
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

comment on table public.staff_profiles is
  'Hospital staff roles. A row here is what makes an auth user a staff member.';

-- Helper: is the caller active staff?
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_profiles
    where id = auth.uid() and is_active
  );
$$;

-- Helper: is the caller an admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_profiles
    where id = auth.uid() and is_active and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- Departments
-- Text primary keys (slugs) keep URLs and seed data readable.
-- ---------------------------------------------------------------------
create table if not exists public.departments (
  id           text        primary key,
  name         text        not null,
  "group"      text        not null default 'Adult'
               check ("group" in ('Adult', 'Paediatric', 'Support')),
  icon         text        not null default 'Stethoscope',
  accent       text        not null default 'blue',
  description  text        not null default '',
  services     text[]      not null default '{}',
  is_new       boolean     not null default false,
  sort_order   integer     not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Doctors
-- ---------------------------------------------------------------------
create table if not exists public.doctors (
  id              text        primary key,
  name            text        not null,
  department_id   text        references public.departments (id) on delete set null,
  specialization  text        not null default '',
  qualification   text        not null default '',
  experience      integer     not null default 0 check (experience between 0 and 70),
  photo           text        not null default '',
  opd_days        text[]      not null default '{}',
  opd_start       time        not null default '10:00',
  opd_end         time        not null default '14:00',
  fee             integer     not null default 0 check (fee >= 0),
  languages       text[]      not null default '{}',
  about           text        not null default '',
  available       boolean     not null default true,
  sort_order       integer    not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint doctors_opd_window check (opd_end > opd_start)
);

create index if not exists doctors_department_idx on public.doctors (department_id);
create index if not exists doctors_available_idx  on public.doctors (available);

-- ---------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------
create table if not exists public.announcements (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  message     text        not null default '',
  type        text        not null default 'info'
              check (type in ('info', 'camp', 'alert', 'holiday')),
  image       text        not null default '',
  pinned      boolean     not null default false,
  active      boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists announcements_live_idx
  on public.announcements (active, pinned, created_at desc);

-- ---------------------------------------------------------------------
-- Appointments
--
-- Patient details are stored inline for now (no separate patients table)
-- to keep this phase out of medical-record territory. `symptoms` is
-- health data under the DPDP Act, hence the read restrictions below.
-- ---------------------------------------------------------------------
create table if not exists public.appointments (
  id                uuid        primary key default gen_random_uuid(),
  ref_id            text        not null unique,
  doctor_id         text        references public.doctors (id) on delete set null,
  department_id     text        references public.departments (id) on delete set null,
  appointment_date  date        not null,
  slot              time        not null,
  patient_name      text        not null check (length(trim(patient_name)) between 2 and 120),
  patient_phone     text        not null check (patient_phone ~ '^[0-9]{10}$'),
  patient_age       integer     not null check (patient_age between 0 and 120),
  patient_gender    text        not null check (patient_gender in ('Male', 'Female', 'Other')),
  symptoms          text        not null default '' check (length(symptoms) <= 500),
  status            text        not null default 'Pending'
                    check (status in ('Pending', 'Confirmed', 'Completed', 'Cancelled')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- THE double-booking guard.
-- An application-level "is this slot free?" check races under concurrency;
-- this makes a clash impossible at the storage layer. Cancelled rows are
-- excluded so a freed slot can be rebooked.
create unique index if not exists appointments_no_double_booking
  on public.appointments (doctor_id, appointment_date, slot)
  where status <> 'Cancelled';

create index if not exists appointments_doctor_date_idx
  on public.appointments (doctor_id, appointment_date);
create index if not exists appointments_status_idx
  on public.appointments (status, created_at desc);
create index if not exists appointments_phone_idx
  on public.appointments (patient_phone);

-- ---------------------------------------------------------------------
-- Audit log
--
-- Added now rather than later: backfilling an audit trail into a system
-- that already holds patient data is impossible to do honestly.
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id          bigserial   primary key,
  actor_id    uuid,
  actor_email text,
  action      text        not null,
  entity      text        not null,
  entity_id   text,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_log_entity_idx on public.audit_log (entity, entity_id);
create index if not exists audit_log_time_idx   on public.audit_log (created_at desc);

-- Generic audit trigger
create or replace function public.write_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email  text;
  v_id     text;
  v_before jsonb;
  v_after  jsonb;
begin
  select email into v_email from auth.users where id = auth.uid();

  -- NEW is unassigned on DELETE and OLD is unassigned on INSERT; reading the
  -- wrong one raises "record is not assigned yet", so branch explicitly.
  if tg_op = 'DELETE' then
    v_id := old.id::text;
    v_before := to_jsonb(old);
    v_after := null;
  elsif tg_op = 'INSERT' then
    v_id := new.id::text;
    v_before := null;
    v_after := to_jsonb(new);
  else
    v_id := new.id::text;
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
  end if;

  insert into public.audit_log (actor_id, actor_email, action, entity, entity_id, before, after)
  values (auth.uid(), v_email, lower(tg_op), tg_table_name, v_id, v_before, v_after);

  -- AFTER triggers ignore the return value.
  return null;
end;
$$;

-- Keep updated_at honest
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Build each identifier as a complete name before quoting it. Writing
-- `%I_audit` would quote only the table part and can emit invalid SQL.
do $$
declare
  t text;
begin
  foreach t in array array['departments', 'doctors', 'announcements', 'appointments']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I
       for each row execute function public.write_audit()', t || '_audit', t);

    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format(
      'create trigger %I before update on public.%I
       for each row execute function public.touch_updated_at()', t || '_touch', t);
  end loop;
end $$;

-- =====================================================================
--  Row Level Security
-- =====================================================================

alter table public.departments    enable row level security;
alter table public.doctors        enable row level security;
alter table public.announcements  enable row level security;
alter table public.appointments   enable row level security;
alter table public.audit_log      enable row level security;
alter table public.staff_profiles enable row level security;

-- ---- Reference data: world-readable, staff-writable -----------------
do $$
declare
  t text;
begin
  foreach t in array array['departments', 'doctors', 'announcements']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_read_all', t);
    execute format(
      'create policy %I on public.%I for select using (true)', t || '_read_all', t);

    execute format('drop policy if exists %I on public.%I', t || '_staff_write', t);
    execute format(
      'create policy %I on public.%I for all
       using (public.is_staff()) with check (public.is_staff())', t || '_staff_write', t);
  end loop;
end $$;

-- ---- Appointments ---------------------------------------------------
-- Anyone may CREATE a booking (patients are not signed in)...
drop policy if exists appointments_public_insert on public.appointments;
create policy appointments_public_insert
  on public.appointments for insert
  with check (
    status = 'Pending'                        -- cannot self-confirm
    and appointment_date >= current_date      -- cannot backdate
    and appointment_date <= current_date + interval '90 days'
  );

-- ...but only staff may READ them. Patient contact details and symptoms
-- must never be listable by the public.
drop policy if exists appointments_staff_read on public.appointments;
create policy appointments_staff_read
  on public.appointments for select using (public.is_staff());

drop policy if exists appointments_staff_update on public.appointments;
create policy appointments_staff_update
  on public.appointments for update
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists appointments_admin_delete on public.appointments;
create policy appointments_admin_delete
  on public.appointments for delete using (public.is_admin());

-- ---- Audit log: staff read only, never client-writable --------------
drop policy if exists audit_staff_read on public.audit_log;
create policy audit_staff_read
  on public.audit_log for select using (public.is_staff());

-- ---- Staff profiles -------------------------------------------------
drop policy if exists staff_read_self on public.staff_profiles;
create policy staff_read_self
  on public.staff_profiles for select
  using (id = auth.uid() or public.is_staff());

drop policy if exists staff_admin_manage on public.staff_profiles;
create policy staff_admin_manage
  on public.staff_profiles for all
  using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
--  Table grants
--
--  RLS decides which ROWS a role may touch; grants decide whether it may
--  touch the table at all. Supabase sets sensible defaults, but stating
--  these explicitly avoids a confusing "permission denied for table"
--  that looks like an RLS problem and is not.
-- =====================================================================

grant usage on schema public to anon, authenticated;

-- Public site reads reference data.
grant select on public.departments, public.doctors, public.announcements to anon, authenticated;

-- Patients create bookings but cannot read them back.
grant insert on public.appointments to anon, authenticated;

-- Staff (signed in) manage everything; RLS still gates it on staff_profiles.
grant select, update, delete on public.appointments to authenticated;
grant insert, update, delete on public.departments, public.doctors, public.announcements to authenticated;
grant select on public.audit_log, public.staff_profiles to authenticated;

-- =====================================================================
--  Slot availability without exposing patient data
--
--  The booking screen needs to know which slots are taken. It must not
--  be able to read who booked them. This function returns times only.
-- =====================================================================
create or replace function public.booked_slots(p_doctor_id text, p_date date)
returns setof time
language sql
stable
security definer
set search_path = public
as $$
  select slot
  from public.appointments
  where doctor_id = p_doctor_id
    and appointment_date = p_date
    and status <> 'Cancelled';
$$;

grant execute on function public.booked_slots(text, date) to anon, authenticated;

-- =====================================================================
--  Post-install checklist
--
--  1. Create your first staff user in Authentication → Users.
--  2. Promote them:
--       insert into public.staff_profiles (id, full_name, role)
--       values ('<that-user-uuid>', 'Your Name', 'admin');
--  3. Seed reference data from the app (see README-backend.md).
--  4. Turn OFF public sign-ups in Authentication → Providers → Email,
--     otherwise anyone could register (they would not be staff without a
--     staff_profiles row, but disabling it removes the noise entirely).
-- =====================================================================
