/**
 * send-appointment-message — Supabase Edge Function
 *
 * Sends a WhatsApp template message to a patient about their appointment.
 *
 * Why this runs on the server and not in the React app: the WhatsApp access
 * token can send messages as the hospital to any number. In a browser bundle
 * anyone could read it from DevTools. It stays here as a Supabase secret and is
 * never shipped to a client.
 *
 * Design decisions worth knowing:
 *
 *  - The caller sends only an appointment id. The phone number is read from the
 *    database server-side, so a compromised staff account cannot use the
 *    hospital's WhatsApp number to message arbitrary people.
 *  - Every attempt is logged, success or failure, before returning.
 *  - A messaging failure never fails the appointment. The status change has
 *    already been committed by the caller; this only reports whether the
 *    patient was actually told.
 *
 * Deploy:
 *   supabase functions deploy send-appointment-message
 *
 * Secrets:
 *   supabase secrets set WHATSAPP_PHONE_NUMBER_ID=... WHATSAPP_ACCESS_TOKEN=...
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Templates this function is allowed to send, mapped to env-configured names.
 *
 * An allow-list, not a passthrough: the caller supplies a `kind`, never a
 * template name, so a compromised staff account cannot send an arbitrary
 * approved template (a promotional one, say) to a patient list.
 *
 * `completed` is the post-visit thank you. It must be approved in WhatsApp
 * Manager under the UTILITY category with the same six body variables as the
 * other two — see src/utils/messageTemplates.js.
 */
const TEMPLATES: Record<string, { envKey: string; fallback: string }> = {
  confirmed: { envKey: 'WHATSAPP_TEMPLATE_CONFIRMED', fallback: 'appointment_confirmed' },
  cancelled: { envKey: 'WHATSAPP_TEMPLATE_CANCELLED', fallback: 'appointment_cancelled' },
  completed: { envKey: 'WHATSAPP_TEMPLATE_COMPLETED', fallback: 'appointment_completed' },
};

const GRAPH_VERSION = Deno.env.get('WHATSAPP_GRAPH_VERSION') ?? 'v21.0';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** `9876543210` → `919876543210`. WhatsApp wants E.164 without the plus. */
function toWhatsAppNumber(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return null;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * `2026-10-04` → `Sat, 4 Oct 2026`
 *
 * Deliberately NOT `toLocaleDateString('en-IN', …)`. Deno and the browser ship
 * different ICU data and render that locale differently, which would make the
 * admin preview disagree with the message a patient actually receives. This is
 * kept identical to `formatTemplateDate` in src/utils/messageTemplates.js.
 */
function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** `14:20:00` → `2:20 PM` */
function formatTime(value: string): string {
  const [h, m = '00'] = String(value).split(':');
  let hour = Number(h);
  if (Number.isNaN(hour)) return value;
  const period = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${m} ${period}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // ---- 1. Authenticate the caller -----------------------------------
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Missing authorization header.' }, 401);
  }

  const asCaller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await asCaller.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: 'Not signed in.' }, 401);
  }
  const userId = userData.user.id;

  // ---- 2. Authorise: must be active staff ---------------------------
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: staff } = await admin
    .from('staff_profiles')
    .select('id, role')
    .eq('id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (!staff) {
    return json({ error: 'Not authorised. Hospital staff only.' }, 403);
  }

  // ---- 3. Validate input --------------------------------------------
  let payload: { appointmentId?: string; kind?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const appointmentId = payload.appointmentId;
  const kind = payload.kind ?? 'confirmed';

  if (!appointmentId) return json({ error: 'appointmentId is required.' }, 400);
  if (!TEMPLATES[kind]) {
    return json({ error: `Unknown template kind "${kind}".` }, 400);
  }

  // ---- 4. Read the appointment server-side --------------------------
  // The client never supplies the phone number.
  const { data: appointment, error: readError } = await admin
    .from('appointments')
    .select(
      'id, ref_id, appointment_date, slot, patient_name, patient_phone, status, ' +
        'doctors ( name ), departments ( name )'
    )
    .eq('id', appointmentId)
    .maybeSingle();

  if (readError) return json({ error: readError.message }, 500);
  if (!appointment) return json({ error: 'Appointment not found.' }, 404);

  const template = Deno.env.get(TEMPLATES[kind].envKey) ?? TEMPLATES[kind].fallback;
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const language = Deno.env.get('WHATSAPP_LANG') ?? 'en';

  const to = toWhatsAppNumber(appointment.patient_phone);

  /** Record the attempt and shape the HTTP response identically. */
  const record = async (
    status: 'sent' | 'failed' | 'skipped',
    extra: { providerMessageId?: string; error?: string } = {}
  ) => {
    await admin.from('notification_log').insert({
      appointment_id: appointment.id,
      channel: 'whatsapp',
      template,
      to_phone: appointment.patient_phone,
      status,
      provider_message_id: extra.providerMessageId ?? null,
      error: extra.error ?? null,
      sent_by: userId,
    });

    return json(
      { status, template, refId: appointment.ref_id, error: extra.error ?? null },
      status === 'failed' ? 502 : 200
    );
  };

  if (!to) {
    return record('skipped', { error: `Unusable phone number: ${appointment.patient_phone}` });
  }

  // Not configured yet: log it as skipped rather than pretending it sent.
  if (!phoneNumberId || !accessToken) {
    return record('skipped', {
      error: 'WhatsApp is not configured (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN unset).',
    });
  }

  // ---- 5. Send via WhatsApp Cloud API -------------------------------
  // Variable order must match the approved template body exactly.
  const params = [
    appointment.patient_name,
    appointment.doctors?.name ?? 'your consultant',
    appointment.departments?.name ?? 'OPD',
    formatDate(appointment.appointment_date),
    formatTime(appointment.slot),
    appointment.ref_id,
  ];

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: template,
      language: { code: language },
      components: [
        {
          type: 'body',
          parameters: params.map((text) => ({ type: 'text', text: String(text) })),
        },
      ],
    },
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      const message = result?.error?.message ?? `WhatsApp API returned ${response.status}`;
      return record('failed', { error: message });
    }

    return record('sent', { providerMessageId: result?.messages?.[0]?.id });
  } catch (error) {
    return record('failed', { error: (error as Error).message });
  }
});
