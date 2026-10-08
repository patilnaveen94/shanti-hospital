/**
 * WhatsApp message templates — preview and variable mapping.
 *
 * WHAT IS AND IS NOT CONFIGURABLE
 *
 * WhatsApp only delivers templates Meta has approved. The body wording lives
 * in Meta's WhatsApp Manager, not here, and editing it requires re-submission
 * and re-approval. So the app cannot change what a patient receives.
 *
 * What the app *does* control:
 *   - whether messages are sent at all, and on which status changes
 *   - which approved template name to use (an Edge Function secret)
 *   - the variable values substituted into {{1}}…{{6}}
 *
 * The body text stored in settings is a MIRROR of the approved template, kept
 * so the admin preview shows the real thing. The variable ORDER below must
 * match `params` in supabase/functions/send-appointment-message/index.ts —
 * if they diverge, patients get a message with details in the wrong places.
 */

import { to12h } from './schedule';

/** Ordered variable definitions. Index + 1 is the `{{n}}` placeholder. */
export const TEMPLATE_VARIABLES = [
  { token: '{{1}}', label: 'Patient name', example: 'Laxmi Kamble' },
  { token: '{{2}}', label: 'Doctor name', example: 'Dr. Mallikarjun Patil' },
  { token: '{{3}}', label: 'Department', example: 'ENT' },
  { token: '{{4}}', label: 'Date', example: 'Sat, 4 Oct 2026' },
  { token: '{{5}}', label: 'Time', example: '10:20 AM' },
  { token: '{{6}}', label: 'Reference', example: 'SH-4KDQ7M' },
];

export const DEFAULT_CONFIRMED_BODY = `Namaste {{1}}, your appointment at Shanti Hospital, Bagalkot is CONFIRMED.

Doctor: {{2}}
Department: {{3}}
Date: {{4}}
Time: {{5}}
Reference: {{6}}

Please arrive 15 minutes early for registration and carry any previous medical records. To reschedule, call 08354 220996.`;

export const DEFAULT_CANCELLED_BODY = `Namaste {{1}}, your appointment at Shanti Hospital, Bagalkot has been CANCELLED.

Doctor: {{2}}
Department: {{3}}
Date: {{4}}
Time: {{5}}
Reference: {{6}}

To book a new appointment, call 08354 220996 or visit our website. We are sorry for the inconvenience.`;

/**
 * Post-visit record.
 *
 * Written to survive Meta's template review as UTILITY, which constrains the
 * wording more than it looks. Since April 2025 Meta silently RE-CATEGORISES a
 * template rather than rejecting it, so promotional language does not get
 * bounced back — it gets approved as MARKETING and billed at roughly 7x.
 *
 * Deliberately removed from an earlier draft: the hospital's "Reaching the
 * unreached" motto (a slogan), "we are here 24x7" (promoting a service),
 * "keep your prescription for your next visit" (nudging a future visit) and
 * "wishing you a quick recovery" (goodwill rather than a transaction record).
 *
 * What is left refers to one specific appointment throughout, and ties the
 * contact line to that appointment's reference rather than inviting the patient
 * to transact again. Utility is still not guaranteed — the visit is over, so
 * there is no ongoing transaction to update, which is the test Meta applies.
 */
export const DEFAULT_COMPLETED_BODY = `Namaste {{1}}, this is the record of your visit to Shanti Hospital, Bagalkot.

Doctor: {{2}}
Department: {{3}}
Visited: {{4}}
Time: {{5}}
Reference: {{6}}

Please follow the prescription given during your consultation. To discuss this consultation, call 08354 220996 and quote the reference above.`;

/**
 * The three patient-facing messages, in the order a visit moves through them.
 *
 * `status` is the appointment status that triggers each one, and `toggleKey` is
 * the admin switch that can suppress it. Keeping all of it in one row is what
 * lets `kindForStatus`, `bodyFor` and `kindEnabled` stay in agreement — the same
 * mapping used to be hard-coded in four separate places, which is how a third
 * message becomes a bug rather than a row in a list.
 */
export const MESSAGE_KINDS = [
  {
    id: 'confirmed',
    label: 'Appointment confirmed',
    description: 'Sent when staff confirm a booking.',
    status: 'Confirmed',
    settingKey: 'whatsappConfirmedBody',
    toggleKey: 'notifyOnConfirm',
    template: 'appointment_confirmed',
    fallback: DEFAULT_CONFIRMED_BODY,
  },
  {
    id: 'cancelled',
    label: 'Appointment cancelled',
    description: 'Sent when a booking is cancelled, so the patient does not travel.',
    status: 'Cancelled',
    settingKey: 'whatsappCancelledBody',
    toggleKey: 'notifyOnCancel',
    template: 'appointment_cancelled',
    fallback: DEFAULT_CANCELLED_BODY,
  },
  {
    id: 'completed',
    label: 'Visit summary',
    description:
      'Sent once the consultation is marked Completed. Off by default — Meta may ' +
      'bill this as a Marketing message, which also needs a separate consent basis ' +
      'under DPDP. Turn it on only once that has been decided.',
    status: 'Completed',
    settingKey: 'whatsappCompletedBody',
    toggleKey: 'notifyOnComplete',
    template: 'appointment_completed',
    fallback: DEFAULT_COMPLETED_BODY,
  },
];

/** Look up a message kind by its id. */
export function messageKind(id) {
  return MESSAGE_KINDS.find((k) => k.id === id) || null;
}

/**
 * Which message a status change should send, or null for statuses that send
 * nothing (`Pending` — the patient already saw the on-screen confirmation).
 */
export function kindForStatus(status) {
  return MESSAGE_KINDS.find((k) => k.status === status)?.id || null;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * `2026-10-04` → `Sat, 4 Oct 2026`.
 *
 * Built by hand rather than with `toLocaleDateString`. The preview runs in the
 * browser (Node in tests) and the real message is formatted in Deno inside the
 * Edge Function; those runtimes ship different ICU data and render `en-IN`
 * differently — one emits `4 Oct 2026`, another `4 Oct, 2026`. A preview that
 * does not match the delivered message byte-for-byte is worse than no preview.
 * The same function is duplicated in the Edge Function for this reason.
 */
export function formatTemplateDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Build the six variable values for an appointment.
 * Order is significant — see the note at the top of this file.
 */
export function templateParams(appointment, doctorName, departmentName) {
  if (!appointment) return TEMPLATE_VARIABLES.map((v) => v.example);

  return [
    appointment.patient?.name || '',
    doctorName || 'your consultant',
    departmentName || 'OPD',
    formatTemplateDate(appointment.date),
    to12h(appointment.slot),
    appointment.refId || '',
  ];
}

/**
 * Substitute `{{1}}`…`{{n}}` in a template body.
 * Unfilled placeholders are left visible rather than blanked, so a mismatch
 * between the mirror text and the variable list is obvious in the preview.
 */
export function renderTemplate(body, params = []) {
  if (!body) return '';
  return body.replace(/\{\{(\d+)\}\}/g, (match, n) => {
    const value = params[Number(n) - 1];
    return value === undefined || value === '' ? match : String(value);
  });
}

/** The stored mirror for a kind, falling back to the shipped default. */
export function bodyFor(kind, settings) {
  const entry = messageKind(kind) || MESSAGE_KINDS[0];
  return settings?.[entry.settingKey] || entry.fallback;
}

/** Is this particular message switched on? */
export function kindEnabled(kind, settings) {
  if (!settings?.whatsappEnabled) return false;
  const entry = messageKind(kind);
  if (!entry) return false;
  // Absent means on: a new toggle should not silence an existing message for
  // hospitals whose settings row predates it.
  return settings[entry.toggleKey] !== false;
}

/**
 * Would a status change actually message the patient?
 * Used to keep the UI from promising a message that is switched off.
 */
export function willNotifyOnStatus(status, settings) {
  const kind = kindForStatus(status);
  return kind ? kindEnabled(kind, settings) : false;
}

/** Placeholders present in a body, for validation against the variable list. */
export function placeholdersIn(body) {
  const found = new Set();
  String(body || '').replace(/\{\{(\d+)\}\}/g, (_, n) => {
    found.add(Number(n));
    return '';
  });
  return Array.from(found).sort((a, b) => a - b);
}
