# Shanti Hospital, Bagalkot — website & appointment system

A mobile-first website and front-office system for [Shanti Hospital](https://www.shantihospital.in/),
a 200-bed multi-speciality hospital in Navanagar, Bagalkot, Karnataka. Patients
can browse departments and consultants, read notices and book an OPD
appointment; staff manage the schedule, walk-ins, doctor leave, announcements
and patient testimonials from an admin dashboard.

Built with React 19, Redux Toolkit and Tailwind CSS. Runs with or without a
backend.

---

## Two modes

The app decides at startup based on whether Supabase credentials are present.

| | Local mode | Cloud mode |
|---|---|---|
| Storage | `localStorage` | Supabase / PostgreSQL |
| Data | Bundled seed | The hospital database |
| Admin sign-in | Demo passcode | Real staff accounts |
| Visible to other devices | No | Yes |
| Setup needed | None | See [`README-backend.md`](./README-backend.md) |

Local mode exists so the site always runs — a missing or misconfigured backend
degrades the app rather than breaking it. It is the right mode for a demo and
the wrong one for real patient data.

---

## Running it

```bash
npm install
npm start          # http://localhost:3000
npm run build      # production bundle in build/
```

No environment variables are needed for local mode.

To connect the database, copy `.env.example` to `.env.local`, fill in the two
Supabase values and restart. Create React App only reads env vars at startup, so
a restart is required — editing `.env.local` while the server runs does nothing.

---

## Deploying

`vercel.json` configures the build. Import the repo at
[vercel.com/new](https://vercel.com/new) and accept the defaults — **set no
environment variables**. Without `REACT_APP_SUPABASE_URL` and
`REACT_APP_SUPABASE_ANON_KEY` the app deploys in local mode, which is the right
shape for a test link: no database to configure, no patient data anywhere, and
the site makes no network calls beyond fonts and the hospital's image CDN.

### What testers should expect in local mode

Seed data lives in each visitor's own `localStorage`, so **every tester gets an
independent copy of the site**. A booking one person makes is invisible to
everyone else, including to staff opening the admin dashboard on another device.
That is fine for checking screens, flows and wording, and useless for testing a
shared workflow — "does the front desk see the booking I just made" needs cloud
mode. Admin sign-in uses the demo passcode in `src/config/hospital.js`.

### Going to cloud mode later

Add the two `REACT_APP_SUPABASE_*` variables in Vercel's project settings and
redeploy. Before doing that on a public URL, read the rate-limiting note in
[`README-backend.md`](./README-backend.md): the booking and testimonial forms are
both unauthenticated, so a public address plus a live database is a spammable
combination.

### Notes on `vercel.json`

- `INLINE_RUNTIME_CHUNK=false` stops Create React App inlining its webpack
  runtime into `index.html`. That inline `<script>` would otherwise force
  `script-src 'unsafe-inline'` in the CSP and defeat most of its value.
- The Content-Security-Policy allow-list is derived from what the app actually
  loads: Google Fonts for CSS and font files, `static.wixstatic.com` for
  hospital photographs, `data:` for generated avatars and testimonial photos, and
  `*.supabase.co` for cloud mode. `style-src` keeps `'unsafe-inline'` because
  React sets style attributes directly; scripts do not need it.
- `frame-ancestors 'none'` and `X-Frame-Options: DENY` stop the booking form
  being framed by another site, which is the usual way a form that collects a
  name, phone number and symptoms gets harvested.

---

## What is here

```
src/
  api/          Supabase client, row mappers, repository (all DB access)
  components/
    admin/      Dashboard: appointments, doctors, leave, notices, settings
    booking/    Five-step booking wizard
    common/     Modal, toaster, shared primitives
    layout/     Header, bottom nav, footer
    patient/    Public-facing sections
  config/       Hospital profile, media URLs, editorial content
  data/         Seed data for local mode
  pages/        Home, About, Departments, Doctors, Announcements, Admin
  store/        Redux slices + localStorage persistence
  utils/        Scheduling, fees, CSV, message templates, formatting
supabase/
  schema.sql    Tables, RLS policies, double-booking guard
  updates-*.sql Ordered migrations — run them all, in sequence
  functions/    Edge Function that sends WhatsApp messages
```

Further docs:

- [`README-backend.md`](./README-backend.md) — Supabase setup, the security
  model, and an honest list of gaps before going live
- [`README-whatsapp.md`](./README-whatsapp.md) — patient messaging, template
  approval and costs

---

## Notes on the data

Doctor names, qualifications, departments and editorial copy are taken from the
hospital's own website. Where the hospital does not publish a figure, the app
hides the field rather than inventing one — `experience: 0` shows no badge, and
consultants without a published portrait get a generated monogram instead of a
stock photo of an unrelated person.

**OPD timings and consultation fees in the seed data are demo placeholders.**
They are not published by the hospital. Staff should set the real schedule from
the admin Doctor Manager before the site is used for actual bookings.

---

## Status

This covers the front office: information, appointments and notices. It is
deliberately **not** an EMR — no diagnoses, prescriptions or clinical records.
That scope carries ABDM certification obligations and belongs in a purpose-built
system.

Before handling real patient data, read the "Known gaps" section of
[`README-backend.md`](./README-backend.md). The short version: no rate limiting
on public booking, no phone verification, no staff MFA, and the Supabase free
tier takes no backups.
