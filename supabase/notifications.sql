-- =====================================================================
--  Shanti Hospital — notification log
--  Run AFTER schema.sql, in the Supabase SQL editor.
--
--  Why a log table at all: WhatsApp delivery is a third-party call that
--  can fail for reasons the hospital cannot control (number not on
--  WhatsApp, template paused, token expired). Staff need to see that a
--  patient was NOT told, and be able to retry. Fire-and-forget messaging
--  is how patients end up arriving on the wrong day.
-- =====================================================================

create table if not exists public.notification_log (
  id                  bigserial   primary key,
  appointment_id      uuid        references public.appointments (id) on delete cascade,
  channel             text        not null default 'whatsapp'
                      check (channel in ('whatsapp', 'sms')),
  template            text        not null,
  -- Stored so staff can confirm which number was contacted. Same data the
  -- appointment already holds, duplicated deliberately: the log must stay
  -- truthful about what happened even if the appointment is later edited.
  to_phone            text        not null,
  status              text        not null default 'queued'
                      check (status in ('queued', 'sent', 'failed', 'skipped')),
  provider            text        not null default 'whatsapp_cloud_api',
  provider_message_id text,
  error               text,
  sent_by             uuid        references auth.users (id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists notification_log_appointment_idx
  on public.notification_log (appointment_id, created_at desc);
create index if not exists notification_log_status_idx
  on public.notification_log (status, created_at desc);

alter table public.notification_log enable row level security;

-- Staff may read the log. Nobody writes to it from a browser: only the
-- Edge Function (service role) inserts rows, so a client cannot fake a
-- "message sent" record.
drop policy if exists notification_staff_read on public.notification_log;
create policy notification_staff_read
  on public.notification_log for select using (public.is_staff());

-- ---------------------------------------------------------------------
-- Convenience view: latest notification per appointment.
-- Lets the admin tracker show one badge per row without N+1 queries.
-- ---------------------------------------------------------------------
-- security_invoker makes the view run with the caller's permissions, so the
-- staff-only RLS on notification_log still applies through it.
create or replace view public.appointment_notification_status
with (security_invoker = on) as
select distinct on (appointment_id)
  appointment_id,
  status,
  template,
  error,
  created_at
from public.notification_log
order by appointment_id, created_at desc;

comment on view public.appointment_notification_status is
  'Most recent notification attempt per appointment, for the admin tracker.';

-- Views inherit the RLS of their underlying tables in Postgres 15+ when
-- created with security_invoker, which keeps the staff-only rule intact.
alter view public.appointment_notification_status set (security_invoker = on);
