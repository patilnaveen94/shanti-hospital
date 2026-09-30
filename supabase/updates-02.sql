-- =====================================================================
--  Shanti Hospital — update 02
--  Adds: per-doctor fee visibility, patient-message configuration.
--
--  Run AFTER updates-01.sql. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Per-doctor fee visibility
--
-- The hospital-wide switch in hospital_settings is the master. This lets a
-- single consultant be excluded — e.g. a visiting specialist whose charge
-- varies, or a service billed only through a scheme.
--
-- Effective visibility = hospital_settings.show_consultation_fees
--                        AND doctors.show_fee
-- ---------------------------------------------------------------------
alter table public.doctors
  add column if not exists show_fee boolean not null default true;

comment on column public.doctors.show_fee is
  'Show this doctor''s fee to patients. ANDed with the hospital-wide setting.';

-- ---------------------------------------------------------------------
-- Patient message configuration
--
-- IMPORTANT: the `*_body` columns do NOT control what WhatsApp sends. Meta
-- approves the template body separately, and only an approved template can
-- be delivered. These columns mirror the approved wording so the admin
-- preview shows the truth, and so staff can see what a patient receives
-- without opening WhatsApp Manager.
--
-- Keep them in step with the templates submitted to Meta.
-- ---------------------------------------------------------------------
alter table public.hospital_settings
  add column if not exists whatsapp_enabled boolean not null default true;

alter table public.hospital_settings
  add column if not exists notify_on_confirm boolean not null default true;

alter table public.hospital_settings
  add column if not exists notify_on_cancel boolean not null default true;

alter table public.hospital_settings
  add column if not exists whatsapp_confirmed_body text;

alter table public.hospital_settings
  add column if not exists whatsapp_cancelled_body text;

comment on column public.hospital_settings.whatsapp_confirmed_body is
  'Mirror of the Meta-approved appointment_confirmed template, for preview only.';
comment on column public.hospital_settings.whatsapp_cancelled_body is
  'Mirror of the Meta-approved appointment_cancelled template, for preview only.';

-- Seed the mirrors with the wording in README-whatsapp.md, so the preview
-- is meaningful before anyone edits anything.
update public.hospital_settings
set whatsapp_confirmed_body = coalesce(whatsapp_confirmed_body,
'Namaste {{1}}, your appointment at Shanti Hospital, Bagalkot is CONFIRMED.

Doctor: {{2}}
Department: {{3}}
Date: {{4}}
Time: {{5}}
Reference: {{6}}

Please arrive 15 minutes early for registration and carry any previous medical records. To reschedule, call 08354 220996.'),
    whatsapp_cancelled_body = coalesce(whatsapp_cancelled_body,
'Namaste {{1}}, your appointment at Shanti Hospital, Bagalkot has been CANCELLED.

Doctor: {{2}}
Department: {{3}}
Date: {{4}}
Time: {{5}}
Reference: {{6}}

To book a new appointment, call 08354 220996 or visit our website. We are sorry for the inconvenience.')
where id = 1;
