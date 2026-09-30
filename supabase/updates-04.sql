-- =====================================================================
--  Shanti Hospital — update 04
--  Adds: post-visit "thank you" message, sent when an appointment is
--        marked Completed.
--
--  Run AFTER updates-03.sql. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Third patient message
--
-- A visit now has three messages rather than two:
--   Confirmed  → confirmation with date, time and reference
--   Cancelled  → cancellation, so the patient does not travel
--   Completed  → thank you, follow-up advice and the helpline  ← new
--
-- As with updates-02, the `*_body` column does NOT control what WhatsApp
-- delivers. Meta approves the template body; this mirrors it so the admin
-- preview tells the truth. The template must be approved in WhatsApp
-- Manager as `appointment_completed` under the UTILITY category, with the
-- same six body variables as the other two.
-- ---------------------------------------------------------------------
alter table public.hospital_settings
  add column if not exists notify_on_complete boolean not null default true;

alter table public.hospital_settings
  add column if not exists whatsapp_completed_body text;

comment on column public.hospital_settings.notify_on_complete is
  'Send the post-visit thank you when an appointment is marked Completed.';

comment on column public.hospital_settings.whatsapp_completed_body is
  'Mirror of the Meta-approved appointment_completed template, for preview only.';

-- Seed the mirror so the preview is meaningful before anyone edits it.
-- `coalesce` keeps a hospital's own edited wording intact on a re-run.
update public.hospital_settings
set whatsapp_completed_body = coalesce(whatsapp_completed_body,
'Namaste {{1}}, thank you for visiting Shanti Hospital, Bagalkot.

Doctor: {{2}}
Department: {{3}}
Visited: {{4}}
Time: {{5}}
Reference: {{6}}

We hope you are feeling better. Please follow the advice and medication given, and keep your prescription for your next visit. For a follow-up or any concern, call 08354 220996 — we are here 24x7.

Wishing you a quick recovery. Reaching the unreached.')
where id = 1;
