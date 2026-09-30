# WhatsApp appointment messages

When staff move an appointment to **Confirmed** (or **Cancelled**), the patient
gets a WhatsApp message. Delivery result shows as a badge in the tracker, with a
**Retry** button if it failed.

Requires the backend from [`README-backend.md`](./README-backend.md) first.

---

## Why this is not in the React app

The WhatsApp access token can send messages as the hospital to **any** number. In
a browser bundle, anyone could read it out of DevTools and message whoever they
like from your verified hospital number.

So it lives in a Supabase **Edge Function**
(`supabase/functions/send-appointment-message`) as a server-side secret.

Two further protections in that function:

- The browser sends **only an appointment id**. The phone number is read from the
  database server-side, so a compromised staff login cannot point the hospital's
  WhatsApp sender at an arbitrary number.
- The caller must have an active `staff_profiles` row. A valid login is not
  enough.

---

## Cost

An appointment confirmation is a **Utility** template — the cheap category.

| Category | India rate (approx.) |
|---|---|
| Utility (appointment updates) | **₹0.115** per delivered message |
| Authentication (OTP) | ₹0.115 |
| Marketing | ₹0.8631 |

Add 18% GST. At 3,000 confirmations/month: **roughly ₹400/month.**

Two things to be aware of:

- **No DLT registration needed** for WhatsApp, unlike SMS in India. This is
  genuinely the faster route to launch.
- **From 1 October 2026** Meta begins charging for service messages and for
  utility messages sent inside the 24-hour window, which were previously free.
  Budget on the per-message rate above rather than assuming free in-window sends.

Rates change — check
[Meta's current pricing](https://developers.facebook.com/docs/whatsapp/pricing)
before committing a budget line.

---

## Setup

### 1. Get a WhatsApp Business sender

1. Create a **Meta Business** account and verify the business.
2. In [Meta for Developers](https://developers.facebook.com), create an app of
   type **Business** and add the **WhatsApp** product.
3. Register the hospital phone number as a WhatsApp sender. It must **not** be
   active on the regular WhatsApp or WhatsApp Business *app* — a number can only
   live in one place.
4. Note the **Phone number ID** and generate a **permanent System User access
   token** with `whatsapp_business_messaging`.

> Use a **System User** token, not the temporary 24-hour test token — otherwise
> messages silently stop working the next day.

Onboarding and business verification take a few days. Start early.

### 2. Create the message templates

In **WhatsApp Manager → Message templates**, create these two. Category must be
**Utility** (marketing category costs ~7x more and can be rejected for
transactional content).

**Template 1** — name: `appointment_confirmed`, language: `English`

```
Namaste {{1}}, your appointment at Shanti Hospital, Bagalkot is CONFIRMED.

Doctor: {{2}}
Department: {{3}}
Date: {{4}}
Time: {{5}}
Reference: {{6}}

Please arrive 15 minutes early for registration and carry any previous medical records. To reschedule, call 08354 220996.
```

**Template 2** — name: `appointment_cancelled`, language: `English`

```
Namaste {{1}}, your appointment at Shanti Hospital, Bagalkot has been CANCELLED.

Doctor: {{2}}
Department: {{3}}
Date: {{4}}
Time: {{5}}
Reference: {{6}}

To book a new appointment, call 08354 220996 or visit our website. We are sorry for the inconvenience.
```

**Template 3** — name: `appointment_completed`, language: `English`

Sent when staff mark an appointment **Completed**, so the patient gets a thank
you and their follow-up instructions in writing rather than only verbally.

```
Namaste {{1}}, thank you for visiting Shanti Hospital, Bagalkot.

Doctor: {{2}}
Department: {{3}}
Visited: {{4}}
Time: {{5}}
Reference: {{6}}

We hope you are feeling better. Please follow the advice and medication given, and keep your prescription for your next visit. For a follow-up or any concern, call 08354 220996 — we are here 24x7.

Wishing you a quick recovery. Reaching the unreached.
```

Still **Utility**, not Marketing: it is the closing record of a transaction the
patient initiated, not a promotion. Submitting it as Marketing costs ~7x more and
can be refused.

**The variable order is fixed**, is the same for all three templates, and must
match the function exactly:

| Variable | Value |
|---|---|
| `{{1}}` | Patient name |
| `{{2}}` | Doctor name |
| `{{3}}` | Department |
| `{{4}}` | Date — `Sat, 4 Oct 2026` |
| `{{5}}` | Time — `2:20 PM` |
| `{{6}}` | Reference — `SH-4KDQ7M` |

If you reorder the template body, update `params` in
`supabase/functions/send-appointment-message/index.ts` to match.

Approval is usually minutes for utility templates, up to ~48 hours if it goes to
human review.

### 3. Create the notification tables

Run [`supabase/notifications.sql`](./supabase/notifications.sql) in the Supabase
SQL editor. This adds `notification_log` and the status view the tracker reads.

### 4. Deploy the function

Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then:

```bash
supabase login
supabase link --project-ref <your-project-ref>

supabase secrets set \
  WHATSAPP_PHONE_NUMBER_ID=123456789012345 \
  WHATSAPP_ACCESS_TOKEN=EAAG... \
  WHATSAPP_TEMPLATE_CONFIRMED=appointment_confirmed \
  WHATSAPP_TEMPLATE_CANCELLED=appointment_cancelled \
  WHATSAPP_TEMPLATE_COMPLETED=appointment_completed \
  WHATSAPP_LANG=en

supabase functions deploy send-appointment-message
```

Optional secrets:

| Secret | Default | Purpose |
|---|---|---|
| `WHATSAPP_GRAPH_VERSION` | `v21.0` | Pin the Graph API version |
| `ALLOWED_ORIGIN` | `*` | Lock CORS to your domain in production |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected
automatically — do not set them.

### 5. Test

In the admin tracker, set a test appointment (with **your own** number) to
**Confirmed**. You should see the badge turn *WhatsApp sent*.

Then walk it through the rest of the lifecycle — **Completed** should deliver the
thank you, and **Cancelled** the cancellation. Each status sends its own message,
and each can be switched off independently under **Admin → Settings → WhatsApp
messages**. **Pending** sends nothing: the patient already saw their reference
number on screen when they booked.

---

## Which message goes when

| Status | Template | Switch |
|---|---|---|
| Pending | — nothing sent | — |
| Confirmed | `appointment_confirmed` | Send on status "Confirmed" |
| Cancelled | `appointment_cancelled` | Send on status "Cancelled" |
| Completed | `appointment_completed` | Send on status "Completed" |

The mapping lives in one place — `MESSAGE_KINDS` in
`src/utils/messageTemplates.js` — and the Edge Function keeps its own allow-list
of the same three names. A caller sends a *kind*, never a template name, so a
compromised staff account cannot push an arbitrary approved template at patients.

If a message is switched off, changing the status still works and the tracker
says plainly that nothing was sent. Staff should never be left assuming a patient
was told when they were not.

---

## Reading the badges

| Badge | Meaning |
|---|---|
| **WhatsApp sent** | Meta accepted the message |
| **Not delivered** | Send failed — hover for the reason, use Retry |
| **Not sent** | Skipped: unusable number, or WhatsApp not configured |
| **Sending** | In flight |

A messaging failure **never** rolls back the status change. Confirming an
appointment is a hospital decision; telling the patient is a side effect. If Meta
is down, the appointment is still confirmed and staff can retry or phone.

### "Not sent" before setup

Expected. The function logs `skipped` with a reason rather than pretending to
succeed. Nothing is broken.

---

## Known gaps

- **Sent ≠ read.** "Sent" means Meta accepted it. Real delivery/read receipts
  arrive via a Meta webhook, which isn't wired up. `provider_message_id` is
  stored so that can be added without a schema change.
- **No opt-out handling.** If a patient replies STOP you must honour it. Needs
  the inbound webhook plus a suppression list.
- **English only.** Kannada would need separate approved templates and a language
  preference per patient.
- **No reminders.** A day-before reminder is the highest-value addition (it cuts
  no-shows) and needs a scheduled job — `pg_cron` calling the same function.
- **No consent record.** Under the DPDP Act you should capture that the patient
  agreed to be contacted on WhatsApp, and when. Add a checkbox to the booking
  form and store it.
