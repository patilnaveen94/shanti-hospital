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
-- Defaults FALSE deliberately. The visit is over by the time this sends, so
-- Meta may categorise the template as Marketing rather than Utility -- and
-- since April 2025 it re-categorises silently instead of rejecting, at roughly
-- 7x the per-message cost. Marketing to patients also needs its own consent
-- basis under the DPDP Act. Both are the hospital's call, so this ships off.
alter table public.hospital_settings
  add column if not exists notify_on_complete boolean not null default false;

-- Covers a database where an earlier version of this file already added the
-- column with `default true`. Existing values are left alone: if a hospital has
-- deliberately switched this on, that decision should stand.
alter table public.hospital_settings
  alter column notify_on_complete set default false;

alter table public.hospital_settings
  add column if not exists whatsapp_completed_body text;

comment on column public.hospital_settings.notify_on_complete is
  'Send the post-visit summary when an appointment is marked Completed. Off by '
  'default: Meta may categorise this template as Marketing rather than Utility.';

comment on column public.hospital_settings.whatsapp_completed_body is
  'Mirror of the Meta-approved appointment_completed template, for preview only.';

-- Seed the mirror so the preview is meaningful before anyone edits it.
-- `coalesce` keeps a hospital's own edited wording intact on a re-run.
--
-- Must stay identical to DEFAULT_COMPLETED_BODY in src/utils/messageTemplates.js,
-- or the admin preview shows wording the patient will not receive. Stripped of
-- the hospital motto, the 24x7 line and the recovery wishes, all of which push
-- Meta to reclassify the template as Marketing.
update public.hospital_settings
set whatsapp_completed_body = coalesce(whatsapp_completed_body,
'Namaste {{1}}, this is the record of your visit to Shanti Hospital, Bagalkot.

Doctor: {{2}}
Department: {{3}}
Visited: {{4}}
Time: {{5}}
Reference: {{6}}

Please follow the prescription given during your consultation. To discuss this consultation, call 08354 220996 and quote the reference above.')
where id = 1;
