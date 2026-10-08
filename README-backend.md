# Backend setup — Shanti Hospital

The app runs in one of two modes, chosen by whether two environment variables
are set. Nothing breaks if you skip this entirely.

| Mode | When | Data lives in | Admin sign-in |
|---|---|---|---|
| **local** | no env vars | seed data + browser `localStorage` | demo passcode |
| **cloud** | env vars set | PostgreSQL (Supabase) | real email + password |

---

## 1. Create the project

1. Sign up at [supabase.com](https://supabase.com) — the **Free plan** is fine to
   start and needs no card.
2. Create a new project.
3. **Choose region: `ap-south-1` (Mumbai).** This cannot be changed later, and
   keeping health data in India matters for DPDP.
4. Save the database password somewhere safe.

### Free vs Pro

The Free plan is right for development. Move to Pro (**$25/mo**) *before real
patient data goes in*, for two reasons:

- **Free has no backups.** None. Appointment records with no backup is not an
  acceptable production position for a hospital.
- **Free projects pause after 7 days idle**, then cold-start for 10–30 seconds.

Capacity is not the reason to upgrade — 500 MB holds years of appointments.

---

## 2. Create the schema

Open **SQL Editor** in the Supabase dashboard and run these files **in order**.
Each one builds on the last, so skipping ahead will fail on a missing table.
Every file is guarded, so re-running is safe.

| # | File | What it adds |
|---|------|--------------|
| 1 | [`supabase/schema.sql`](./supabase/schema.sql) | Core tables, audit log, RLS policies, and the unique index that makes double-booking impossible |
| 2 | [`supabase/notifications.sql`](./supabase/notifications.sql) | `notification_log` — so staff can see when a WhatsApp message did *not* reach a patient, and retry it |
| 3 | [`supabase/updates-01.sql`](./supabase/updates-01.sql) | Hospital settings, per-doctor slot length, walk-in source, doctor leave / blocked dates |
| 4 | [`supabase/updates-02.sql`](./supabase/updates-02.sql) | Per-doctor fee visibility, patient-message configuration |
| 5 | [`supabase/updates-03.sql`](./supabase/updates-03.sql) | `testimonials` + the `public_testimonials` view that moderation depends on |
| 6 | [`supabase/updates-04.sql`](./supabase/updates-04.sql) | The post-visit message sent when an appointment is marked Completed |
| 7 | [`supabase/updates-05.sql`](./supabase/updates-05.sql) | Patient records and prescriptions — **read the warning at the top of that file first** |
| 8 | [`supabase/updates-06.sql`](./supabase/updates-06.sql) | Links appointments to patient records, so prescriptions are added from the appointment list |

### Before running `updates-05.sql`

That migration crosses a line the earlier schema drew on purpose. `schema.sql`
notes above `appointments` that the phase was kept *"out of medical-record
territory"*. Prescriptions are clinical records, which brings:

- **DPDP** sensitive-personal-data duties — purpose limitation, breach
  reporting, access and erasure requests.
- **Statutory medical-record retention** under state medical council rules,
  which *conflicts* with DPDP erasure rights. Nothing in the migration
  auto-deletes; get a medico-legal opinion, then encode the answer.
- Possible **ABDM / FHIR R4** obligations if the hospital is empanelled under
  PM-JAY. The column shapes map cleanly onto FHIR `Patient` and
  `MedicationRequest`, but no FHIR layer is built.

It also creates a **private storage bucket** (`prescriptions`) and gates
clinical tables behind a new `is_clinician()` check — `admin` and `doctor` roles
only. `front_desk` can register and find patients but cannot read prescriptions.
Whoever scans prescriptions at your hospital needs one of the two clinical roles.

**Do not run it on a project without backups.** The free tier has none.

The single most important thing `schema.sql` does is that unique index: it makes
double-booking impossible at the storage layer rather than hoping the app checks
first.

If you skip a migration the app does not crash — it degrades. `updates-01`
missing means the settings defaults in code stand; `updates-03` missing means the
About page simply shows no patient testimonials; `updates-04` missing means the
thank-you switch cannot be saved, though the message still sends because an
absent column reads as "on". That is deliberate, but it also means a missing
migration is quiet, so check them off.

### A note on testimonial moderation

`updates-03.sql` is what actually enforces approval. Anonymous visitors can only
read through `public_testimonials`, which filters to `status = 'approved'`, and
their inserts are forced to `pending` regardless of what the browser sends. The
admin screen is the intended path, not the barrier — so an unmoderated quote
cannot reach the site even if the front end is bypassed entirely.

---

## 3. Connect the app

```bash
cp .env.example .env.local
```

Fill in both values from **Project Settings → API**:

```
REACT_APP_SUPABASE_URL=https://xxxxxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGci...
```

Then **restart the dev server** — Create React App only reads env vars at boot.

```bash
npm start
```

> Use the **anon** key, never the `service_role` key. The anon key is designed to
> be public and grants nothing by itself; RLS decides what it can touch. The
> `service_role` key bypasses RLS completely and would expose every patient
> record to anyone who opened DevTools.

---

## 4. Create your first staff account

Staff accounts are deliberately not self-service.

1. **Authentication → Users → Add user.** Enter an email and password, and tick
   *Auto Confirm User*.
2. Copy the new user's UUID.
3. **SQL Editor**, substituting that UUID:

   ```sql
   insert into public.staff_profiles (id, full_name, role)
   values ('00000000-0000-0000-0000-000000000000', 'Your Name', 'admin');
   ```

4. **Authentication → Providers → Email → turn off "Enable sign ups".**
   Without a `staff_profiles` row a random signup can't do anything, but
   disabling it removes the noise.

**Why two steps?** Authentication proves who you are; authorisation decides what
you may do. A valid login with no `staff_profiles` row is rejected by the app and
by every RLS policy. Roles available: `admin`, `front_desk`, `doctor`,
`read_only`.

---

## 5. Load the starting data

Sign in to the app as your new staff user, go to **Admin**, and use
**Seed database from bundled data** on the dashboard.

This pushes the 22 departments, 29 consultants and the announcements into
Postgres. It refuses to run if the tables already contain rows, so it cannot
overwrite records the hospital has edited.

---

## What the security model actually enforces

Set server-side in `schema.sql`, so the browser cannot talk its way around it:

| Table | Public (anonymous visitor) | Staff |
|---|---|---|
| `departments` | read | full |
| `doctors` | read | full |
| `announcements` | read | full |
| `appointments` | **insert only** | read + update; delete is admin-only |
| `audit_log` | nothing | read |

Two details worth understanding:

- **Patients can create a booking but cannot read the appointments table.**
  Otherwise anyone could list every patient's name, phone number and symptoms.
  The booking screen still needs to know which slots are taken, so it calls a
  `booked_slots()` database function that returns *times only*.

- **Anonymous inserts are constrained, not trusted.** A booking must be
  `Pending` (you cannot self-confirm), dated today or later, and within 90 days.
  Phone, age and gender are validated by check constraints.

---

## Known gaps before going live

Honest list of what this setup does *not* yet do:

- **No rate limiting on public booking.** Someone could script spam bookings.
  Needs an Edge Function with a per-phone/IP throttle, or CAPTCHA.
- **No phone verification.** Anyone can book under any number. Phone + OTP is
  the standard fix and Supabase Auth supports it.
- **No SMS confirmation.** Needs a provider plus TRAI DLT sender registration —
  start that paperwork early, it takes calendar time.
- **No staff MFA.** Available in Supabase Auth; enable before launch.
- **Testimonial photos live in a column, not in Storage.** They are downscaled in
  the browser to a small JPEG data URL (≤120 KB, capped at 200 KB by the column
  check), which avoids bucket configuration and works identically in local mode.
  That is fine for a 56px avatar and wrong for anything bigger — move to Supabase
  Storage before accepting any other kind of upload.
- **Testimonial submission is unauthenticated.** Same exposure as public booking:
  it needs the rate limiting above, or someone can flood the moderation queue.
- **Retention policy not implemented.** DPDP grants erasure rights while medical
  records carry statutory retention. Get a medico-legal opinion, then encode it.

---

## Reverting to local mode

Delete or empty `.env.local` and restart. The app falls back to seed data and
the demo passcode. Useful for offline demos.
