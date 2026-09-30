-- =====================================================================
--  Shanti Hospital — update 01
--  Adds: hospital settings, per-doctor slot length, walk-in source,
--        doctor unavailability (leave / blocked dates).
--
--  Run AFTER schema.sql and notifications.sql. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Hospital settings
--
-- Single-row table (id is pinned to 1). A key/value store would be more
-- flexible but loses type checking, and there are only a handful of
-- genuinely global switches.
-- ---------------------------------------------------------------------
create table if not exists public.hospital_settings (
  id                     integer     primary key default 1 check (id = 1),
  -- Whether patients see consultation fees anywhere on the public site.
  show_consultation_fees boolean     not null default true,
  -- Fallback slot length for doctors with nothing set.
  default_slot_minutes   integer     not null default 20
                         check (default_slot_minutes in (5, 10, 15, 20, 30, 45, 60)),
  -- How far ahead patients may book. The RLS policy on appointments caps
  -- this at 90 days regardless, so this can only narrow the window.
  booking_horizon_days   integer     not null default 60
                         check (booking_horizon_days between 1 and 90),
  updated_at             timestamptz not null default now()
);

insert into public.hospital_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Per-doctor slot length
--
-- A paediatric follow-up and a neurosurgery consult are not the same
-- length, so this belongs on the doctor rather than being global.
-- ---------------------------------------------------------------------
alter table public.doctors
  add column if not exists slot_minutes integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'doctors_slot_minutes_check'
  ) then
    alter table public.doctors
      add constraint doctors_slot_minutes_check
      check (slot_minutes is null or slot_minutes in (5, 10, 15, 20, 30, 45, 60));
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Where a booking came from
--
-- Walk-ins are entered at the counter by staff. Tracking the source keeps
-- "how many people actually booked online" answerable later.
-- ---------------------------------------------------------------------
alter table public.appointments
  add column if not exists source text not null default 'online';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_source_check'
  ) then
    alter table public.appointments
      add constraint appointments_source_check
      check (source in ('online', 'walkin', 'phone'));
  end if;
end $$;

create index if not exists appointments_source_idx on public.appointments (source);

-- ---------------------------------------------------------------------
-- Doctor unavailability
--
-- Specific blocked dates, as ranges so one row covers both a single day
-- off and a fortnight away. This is separate from `doctors.available`,
-- which means "not taking bookings at all, indefinitely".
-- ---------------------------------------------------------------------
create table if not exists public.doctor_unavailability (
  id          uuid        primary key default gen_random_uuid(),
  doctor_id   text        not null references public.doctors (id) on delete cascade,
  from_date   date        not null,
  to_date     date        not null,
  reason      text        not null default '',
  created_by  uuid        references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint unavailability_range check (to_date >= from_date)
);

create index if not exists unavailability_doctor_idx
  on public.doctor_unavailability (doctor_id, from_date, to_date);

-- Stop the same doctor being blocked twice for an identical span.
create unique index if not exists unavailability_no_exact_duplicate
  on public.doctor_unavailability (doctor_id, from_date, to_date);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.hospital_settings      enable row level security;
alter table public.doctor_unavailability  enable row level security;

-- Settings: world-readable (the site needs to know whether to show fees),
-- staff-writable.
drop policy if exists settings_read_all on public.hospital_settings;
create policy settings_read_all
  on public.hospital_settings for select using (true);

drop policy if exists settings_staff_write on public.hospital_settings;
create policy settings_staff_write
  on public.hospital_settings for update
  using (public.is_staff()) with check (public.is_staff());

-- Unavailability: world-readable, because the booking screen must know
-- which dates to hide. Only the dates and reason are exposed — no patient
-- data lives in this table.
drop policy if exists unavailability_read_all on public.doctor_unavailability;
create policy unavailability_read_all
  on public.doctor_unavailability for select using (true);

drop policy if exists unavailability_staff_write on public.doctor_unavailability;
create policy unavailability_staff_write
  on public.doctor_unavailability for all
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------
grant select on public.hospital_settings, public.doctor_unavailability to anon, authenticated;
grant update on public.hospital_settings to authenticated;
grant insert, update, delete on public.doctor_unavailability to authenticated;

-- ---------------------------------------------------------------------
-- Audit the new tables too
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['hospital_settings', 'doctor_unavailability']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I
       for each row execute function public.write_audit()', t || '_audit', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Which appointments clash with a proposed block?
--
-- Called before saving a leave range so staff can be told exactly who
-- needs a phone call. Returning this from the database keeps the check
-- honest even if two admins act at once.
-- ---------------------------------------------------------------------
create or replace function public.appointments_in_range(
  p_doctor_id text,
  p_from date,
  p_to date
)
returns table (
  ref_id           text,
  appointment_date date,
  slot             time,
  patient_name     text,
  patient_phone    text,
  status           text
)
language sql
stable
security invoker
as $$
  select a.ref_id, a.appointment_date, a.slot, a.patient_name, a.patient_phone, a.status
  from public.appointments a
  where a.doctor_id = p_doctor_id
    and a.appointment_date between p_from and p_to
    and a.status in ('Pending', 'Confirmed')
  order by a.appointment_date, a.slot;
$$;

-- security invoker, not definer: this returns patient contact details, so
-- it must respect the staff-only RLS on appointments rather than bypass it.
revoke all on function public.appointments_in_range(text, date, date) from anon;
grant execute on function public.appointments_in_range(text, date, date) to authenticated;
