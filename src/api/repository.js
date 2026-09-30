/**
 * Data access layer. Every database read and write lives here, so the Redux
 * slices stay free of PostgREST detail and there is exactly one place to audit
 * when the schema moves.
 */

import { describeError, requireClient, supabase } from './client';
import {
  announcementFromRow,
  announcementToRow,
  appointmentFromRow,
  appointmentToRow,
  departmentFromRow,
  departmentToRow,
  doctorFromRow,
  doctorToRow,
  settingsFromRow,
  settingsToRow,
  testimonialFromRow,
  testimonialToRow,
  unavailabilityFromRow,
  unavailabilityToRow,
} from './mappers';

/** Unwrap a PostgREST response or throw a message fit for a toast. */
function unwrap({ data, error }) {
  if (error) throw new Error(describeError(error));
  return data;
}

/* ===================== reference data ===================== */

export async function fetchDepartments() {
  const db = requireClient();
  const rows = unwrap(
    await db.from('departments').select('*').order('sort_order').order('name')
  );
  return rows.map(departmentFromRow);
}

export async function fetchDoctors() {
  const db = requireClient();
  const rows = unwrap(
    await db.from('doctors').select('*').order('sort_order').order('name')
  );
  return rows.map(doctorFromRow);
}

export async function fetchAnnouncements() {
  const db = requireClient();
  const rows = unwrap(
    await db.from('announcements').select('*').order('created_at', { ascending: false })
  );
  return rows.map(announcementFromRow);
}

/**
 * Load everything the public site needs in one round trip.
 * Appointments are fetched separately because only staff may read them.
 */
export async function fetchPublicData() {
  const [departments, doctors, announcements, settings, unavailability] = await Promise.all([
    fetchDepartments(),
    fetchDoctors(),
    fetchAnnouncements(),
    fetchSettings(),
    fetchUnavailability(),
  ]);
  return { departments, doctors, announcements, settings, unavailability };
}

/* ===================== departments ===================== */

export async function insertDepartment(department) {
  const db = requireClient();
  const rows = unwrap(
    await db.from('departments').insert(departmentToRow(department)).select().single()
  );
  return departmentFromRow(rows);
}

export async function updateDepartmentRow(id, changes) {
  const db = requireClient();
  const patch = departmentToRow({ id, ...changes });
  delete patch.id; // never rewrite the primary key
  delete patch.sort_order;
  const row = unwrap(await db.from('departments').update(patch).eq('id', id).select().single());
  return departmentFromRow(row);
}

export async function deleteDepartment(id) {
  const db = requireClient();
  unwrap(await db.from('departments').delete().eq('id', id).select());
  return id;
}

/* ===================== doctors ===================== */

export async function insertDoctor(doctor) {
  const db = requireClient();
  const row = unwrap(await db.from('doctors').insert(doctorToRow(doctor)).select().single());
  return doctorFromRow(row);
}

export async function updateDoctorRow(id, doctor) {
  const db = requireClient();
  const patch = doctorToRow({ id, ...doctor });
  delete patch.id;
  delete patch.sort_order;
  const row = unwrap(await db.from('doctors').update(patch).eq('id', id).select().single());
  return doctorFromRow(row);
}

export async function setDoctorAvailability(id, available) {
  const db = requireClient();
  const row = unwrap(
    await db.from('doctors').update({ available }).eq('id', id).select().single()
  );
  return doctorFromRow(row);
}

export async function deleteDoctor(id) {
  const db = requireClient();
  unwrap(await db.from('doctors').delete().eq('id', id).select());
  return id;
}

/** Detach doctors from a department that is being removed. */
export async function clearDepartmentFromDoctors(departmentId) {
  const db = requireClient();
  unwrap(await db.from('doctors').update({ department_id: null }).eq('department_id', departmentId));
  return departmentId;
}

/* ===================== announcements ===================== */

export async function insertAnnouncement(announcement) {
  const db = requireClient();
  const row = unwrap(
    await db.from('announcements').insert(announcementToRow(announcement)).select().single()
  );
  return announcementFromRow(row);
}

export async function updateAnnouncementRow(id, changes) {
  const db = requireClient();
  const patch = announcementToRow({ ...changes });
  delete patch.created_at;
  const row = unwrap(await db.from('announcements').update(patch).eq('id', id).select().single());
  return announcementFromRow(row);
}

export async function patchAnnouncement(id, patch) {
  const db = requireClient();
  const row = unwrap(await db.from('announcements').update(patch).eq('id', id).select().single());
  return announcementFromRow(row);
}

export async function deleteAnnouncement(id) {
  const db = requireClient();
  unwrap(await db.from('announcements').delete().eq('id', id).select());
  return id;
}

/* ===================== appointments ===================== */

/** Staff-only: the full booking list for the tracker. */
export async function fetchAppointments() {
  const db = requireClient();
  const rows = unwrap(
    await db.from('appointments').select('*').order('created_at', { ascending: false })
  );
  return rows.map(appointmentFromRow);
}

/**
 * Create a booking.
 *
 * Returns the stored row so the confirmation screen shows what the database
 * actually persisted, not what the client hoped for. A clash on the
 * double-booking index surfaces as a friendly "pick another time".
 */
export async function insertAppointment(appointment) {
  const db = requireClient();
  const row = unwrap(
    await db.from('appointments').insert(appointmentToRow(appointment)).select().single()
  );
  return appointmentFromRow(row);
}

export async function updateAppointmentStatus(id, status) {
  const db = requireClient();
  const row = unwrap(
    await db.from('appointments').update({ status }).eq('id', id).select().single()
  );
  return appointmentFromRow(row);
}

export async function deleteAppointment(id) {
  const db = requireClient();
  unwrap(await db.from('appointments').delete().eq('id', id).select());
  return id;
}

/**
 * Which slots are already taken for a doctor on a date.
 *
 * Uses a security-definer function so the booking screen can see *times*
 * without being able to read patient names, phone numbers or symptoms.
 */
export async function fetchBookedSlots(doctorId, date) {
  const db = requireClient();
  if (!doctorId || !date) return [];
  const data = unwrap(await db.rpc('booked_slots', { p_doctor_id: doctorId, p_date: date }));
  return (data || []).map((t) => String(t).slice(0, 5));
}

/* ===================== hospital settings ===================== */

export async function fetchSettings() {
  const db = requireClient();
  const { data, error } = await db.from('hospital_settings').select('*').eq('id', 1).maybeSingle();
  // A missing table (updates-01.sql not run yet) must not break the site.
  if (error || !data) return null;
  return settingsFromRow(data);
}

export async function updateSettingsRow(changes) {
  const db = requireClient();
  const row = unwrap(
    await db
      .from('hospital_settings')
      .update({ ...settingsToRow(changes), updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single()
  );
  return settingsFromRow(row);
}

/* ===================== doctor unavailability ===================== */

export async function fetchUnavailability() {
  const db = requireClient();
  const { data, error } = await db
    .from('doctor_unavailability')
    .select('*')
    .order('from_date');
  if (error) return [];
  return (data || []).map(unavailabilityFromRow);
}

export async function insertUnavailability(block) {
  const db = requireClient();
  const row = unwrap(
    await db.from('doctor_unavailability').insert(unavailabilityToRow(block)).select().single()
  );
  return unavailabilityFromRow(row);
}

export async function deleteUnavailability(id) {
  const db = requireClient();
  unwrap(await db.from('doctor_unavailability').delete().eq('id', id).select());
  return id;
}

/**
 * Appointments that would clash with a proposed leave range.
 *
 * Asked of the database rather than the local store so the answer is correct
 * even if another admin booked someone a second ago.
 */
export async function fetchClashingAppointments(doctorId, fromDate, toDate) {
  const db = requireClient();
  const { data, error } = await db.rpc('appointments_in_range', {
    p_doctor_id: doctorId,
    p_from: fromDate,
    p_to: toDate,
  });
  if (error) return [];
  return (data || []).map((r) => ({
    refId: r.ref_id,
    date: r.appointment_date,
    slot: String(r.slot).slice(0, 5),
    patientName: r.patient_name,
    patientPhone: r.patient_phone,
    status: r.status,
  }));
}

/* ===================== testimonials ===================== */

/**
 * Public: approved testimonials only.
 * Reads the `public_testimonials` view, which omits the private contact number.
 */
export async function fetchApprovedTestimonials() {
  const db = requireClient();
  const { data, error } = await db
    .from('public_testimonials')
    .select('*')
    .order('created_at', { ascending: false });

  // Missing view (updates-03.sql not run) must not break the About page.
  if (error) return [];
  return (data || []).map(testimonialFromRow);
}

/** Staff: the full moderation queue. */
export async function fetchAllTestimonials() {
  const db = requireClient();
  const { data, error } = await db
    .from('testimonials')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []).map(testimonialFromRow);
}

export async function insertTestimonial(testimonial) {
  const db = requireClient();
  const row = unwrap(
    await db.from('testimonials').insert(testimonialToRow(testimonial)).select().single()
  );
  return testimonialFromRow(row);
}

export async function reviewTestimonialRow(id, status, note = '') {
  const db = requireClient();
  const { data: session } = await db.auth.getUser();

  const row = unwrap(
    await db
      .from('testimonials')
      .update({
        status,
        review_note: note,
        reviewed_by: session?.user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
  );
  return testimonialFromRow(row);
}

export async function removeTestimonialRow(id) {
  const db = requireClient();
  unwrap(await db.from('testimonials').delete().eq('id', id).select());
  return id;
}

/* ===================== notifications ===================== */

/**
 * Ask the Edge Function to WhatsApp a patient about their appointment.
 *
 * Only the appointment id and template kind are sent. The phone number is read
 * server-side so the hospital's WhatsApp sender cannot be pointed at an
 * arbitrary number from the client.
 *
 * Resolves to `{ status, error }` and never throws: a messaging failure must not
 * roll back a status change that has already been committed.
 */
export async function sendAppointmentMessage(appointmentId, kind = 'confirmed') {
  const db = requireClient();

  try {
    const { data, error } = await db.functions.invoke('send-appointment-message', {
      body: { appointmentId, kind },
    });

    if (error) {
      // Edge Functions return the response body on non-2xx; surface the real
      // reason where we can rather than "Edge Function returned a non-2xx".
      let detail = error.message;
      try {
        const parsed = await error.context?.json?.();
        if (parsed?.error) detail = parsed.error;
      } catch {
        /* keep the generic message */
      }
      return { status: 'failed', error: detail };
    }

    return { status: data?.status || 'sent', error: data?.error || null };
  } catch (error) {
    return { status: 'failed', error: describeError(error) };
  }
}

/** Latest notification attempt per appointment, for the tracker badges. */
export async function fetchNotificationStatuses() {
  const db = requireClient();
  const { data, error } = await db
    .from('appointment_notification_status')
    .select('appointment_id, status, template, error, created_at');

  // A missing view (notifications.sql not run yet) should not break the page.
  if (error) return {};

  return (data || []).reduce((acc, row) => {
    acc[row.appointment_id] = {
      status: row.status,
      template: row.template,
      error: row.error,
      at: row.created_at,
    };
    return acc;
  }, {});
}

/* ===================== staff auth ===================== */

export async function signInStaff(email, password) {
  const db = requireClient();
  const auth = unwrap(await db.auth.signInWithPassword({ email, password }));

  // Authentication is not authorisation: a valid login is only staff if a
  // staff_profiles row exists and is active.
  const profile = await fetchStaffProfile(auth.user.id);
  if (!profile) {
    await db.auth.signOut();
    throw new Error('This account is not registered as hospital staff.');
  }
  return { user: auth.user, profile };
}

export async function fetchStaffProfile(userId) {
  const db = requireClient();
  const { data, error } = await db
    .from('staff_profiles')
    .select('*')
    .eq('id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new Error(describeError(error));
  return data || null;
}

export async function signOutStaff() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/** Restore an existing staff session on page load. */
export async function restoreSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const user = data?.session?.user;
  if (!user) return null;

  try {
    const profile = await fetchStaffProfile(user.id);
    return profile ? { user, profile } : null;
  } catch {
    return null;
  }
}

/* ===================== seeding ===================== */

/**
 * One-time push of the bundled seed data into an empty database.
 *
 * Guarded: refuses to run if reference data already exists, so it can never
 * clobber records the hospital has edited. Requires a signed-in staff session
 * because RLS restricts writes.
 */
export async function seedDatabase({ departments, doctors, announcements }) {
  const db = requireClient();

  const [{ count: deptCount }, { count: docCount }] = await Promise.all([
    db.from('departments').select('id', { count: 'exact', head: true }),
    db.from('doctors').select('id', { count: 'exact', head: true }),
  ]);

  if ((deptCount || 0) > 0 || (docCount || 0) > 0) {
    throw new Error(
      `Database is not empty (${deptCount || 0} departments, ${docCount || 0} doctors). ` +
        'Seeding was skipped to avoid overwriting existing records.'
    );
  }

  // Departments first — doctors reference them.
  unwrap(await db.from('departments').insert(departments.map(departmentToRow)));
  unwrap(await db.from('doctors').insert(doctors.map(doctorToRow)));
  unwrap(await db.from('announcements').insert(announcements.map(announcementToRow)));

  return {
    departments: departments.length,
    doctors: doctors.length,
    announcements: announcements.length,
  };
}
