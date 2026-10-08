/**
 * Data access layer. Every database read and write lives here, so the Redux
 * slices stay free of PostgREST detail and there is exactly one place to audit
 * when the schema moves.
 */

import { describeError, requireClient, supabase } from './client';
import {
  ageFromPatient,
  announcementFromRow,
  announcementToRow,
  appointmentFromRow,
  appointmentToRow,
  departmentFromRow,
  departmentToRow,
  doctorFromRow,
  doctorToRow,
  patientCandidateFromRow,
  patientFromRow,
  patientToRow,
  prescriptionFileFromRow,
  prescriptionFileToRow,
  prescriptionFromRow,
  prescriptionToRow,
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

/* ===================== patients ===================== */

export const RX_BUCKET = 'prescriptions';

/**
 * Candidate patients for a phone number.
 *
 * Goes through the `find_patients_by_phone` RPC rather than querying the table,
 * so the join and the ordering live in one place. Always returns a list, even
 * for a single hit: the caller must confirm, because one match on a phone is
 * exactly the shared-family-number case.
 */
export async function findPatientsByPhone(phone) {
  const db = requireClient();
  const { data, error } = await db.rpc('find_patients_by_phone', { p_phone: phone });
  if (error) throw new Error(describeError(error));
  return (data || []).map(patientCandidateFromRow);
}

export async function fetchPatient(id) {
  const db = requireClient();
  const row = unwrap(
    await db
      .from('patients')
      .select('*, patient_phones ( phone, is_primary, label )')
      .eq('id', id)
      .single()
  );
  return patientFromRow(row);
}

export async function searchPatients(term, limit = 20) {
  const db = requireClient();
  const needle = `%${(term || '').trim()}%`;
  const rows = unwrap(
    await db
      .from('patients')
      .select('*, patient_phones ( phone, is_primary, label )')
      .or(`full_name.ilike.${needle},mrn.ilike.${needle}`)
      .order('updated_at', { ascending: false })
      .limit(limit)
  );
  return rows.map(patientFromRow);
}

/**
 * Create a patient and attach the number that found them.
 *
 * Two statements rather than one RPC, so a duplicate phone on an existing
 * patient does not roll back the patient row. The phone insert is idempotent
 * via the composite primary key.
 */
export async function insertPatient(patient, phone, phoneLabel = '') {
  const db = requireClient();
  const row = unwrap(
    await db.from('patients').insert(patientToRow(patient)).select().single()
  );

  if (phone) {
    const { error } = await db
      .from('patient_phones')
      .upsert(
        { patient_id: row.id, phone, is_primary: true, label: phoneLabel },
        { onConflict: 'patient_id,phone' }
      );
    if (error) throw new Error(describeError(error));
  }

  return fetchPatient(row.id);
}

export async function updatePatientRow(id, changes) {
  const db = requireClient();
  const patch = patientToRow(changes);
  unwrap(await db.from('patients').update(patch).eq('id', id).select().single());
  return fetchPatient(id);
}

/** Attach another number to an existing patient — they changed phones. */
export async function addPatientPhone(patientId, phone, label = '', isPrimary = false) {
  const db = requireClient();
  const { error } = await db
    .from('patient_phones')
    .upsert(
      { patient_id: patientId, phone, is_primary: isPrimary, label },
      { onConflict: 'patient_id,phone' }
    );
  if (error) throw new Error(describeError(error));
  return fetchPatient(patientId);
}

/* ===================== prescriptions ===================== */

/**
 * Columns the history list needs.
 *
 * `ocr_text` is deliberately excluded. It can run to several kilobytes per
 * row and nothing in the list renders it, so selecting it would drag megabytes
 * across a 4G connection to display a date and a doctor's name.
 */
const RX_LIST_COLUMNS =
  'id, patient_id, appointment_id, doctor_id, department_id, issued_at, notes_text, ' +
  'ocr_status, created_at, prescription_files ( id, thumb_path, storage_path, mime_type, page_no, width, height, bytes )';

/**
 * One page of a patient's prescription history, newest first.
 *
 * Paginated because a long-standing patient may have dozens of visits and a
 * phone should not load all of them. Backed by the
 * `(patient_id, issued_at desc)` index.
 */
export async function fetchPatientHistory(patientId, { limit = 10, offset = 0 } = {}) {
  const db = requireClient();
  const { data, error, count } = await db
    .from('prescriptions')
    .select(RX_LIST_COLUMNS, { count: 'exact' })
    .eq('patient_id', patientId)
    .order('issued_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(describeError(error));
  return {
    items: (data || []).map(prescriptionFromRow),
    total: count ?? 0,
  };
}

/** The full record, including the unverified OCR text. */
export async function fetchPrescription(id) {
  const db = requireClient();
  const row = unwrap(
    await db
      .from('prescriptions')
      .select('*, prescription_files ( * )')
      .eq('id', id)
      .single()
  );
  return prescriptionFromRow(row);
}

export async function insertPrescription(rx) {
  const db = requireClient();
  const row = unwrap(
    await db.from('prescriptions').insert(prescriptionToRow(rx)).select().single()
  );
  return prescriptionFromRow(row);
}

export async function updatePrescriptionRow(id, changes) {
  const db = requireClient();
  const patch = {};
  if ('notesText' in changes) patch.notes_text = (changes.notesText || '').trim();
  if ('issuedAt' in changes) patch.issued_at = changes.issuedAt;
  if ('doctorId' in changes) patch.doctor_id = changes.doctorId || null;
  if ('departmentId' in changes) patch.department_id = changes.departmentId || null;
  if ('ocrStatus' in changes) patch.ocr_status = changes.ocrStatus;

  const row = unwrap(
    await db.from('prescriptions').update(patch).eq('id', id).select().single()
  );
  return prescriptionFromRow(row);
}

export async function deletePrescription(id) {
  const db = requireClient();
  unwrap(await db.from('prescriptions').delete().eq('id', id).select());
  return id;
}

/* ---------------- files and storage ---------------- */

/** `rx/<patientId>/<prescriptionId>/p<n>.jpg` */
function storageKey(patientId, prescriptionId, pageNo, suffix = '') {
  return `rx/${patientId}/${prescriptionId}/p${pageNo}${suffix}.jpg`;
}

/**
 * Upload one prepared page and register it.
 *
 * Order matters: bytes go to storage first, and only a successful upload
 * inserts the row. The reverse order would leave rows pointing at files that
 * do not exist, which is far harder to detect than an orphaned object.
 *
 * `prepared` is the result of prepareDocumentImage().
 */
export async function uploadPrescriptionPage(prescription, prepared, pageNo) {
  const db = requireClient();
  const fullPath = storageKey(prescription.patientId, prescription.id, pageNo);
  const thumbPath = storageKey(prescription.patientId, prescription.id, pageNo, '-thumb');

  const up = await db.storage
    .from(RX_BUCKET)
    .upload(fullPath, prepared.full.blob, { contentType: 'image/jpeg', upsert: true });
  if (up.error) throw new Error(describeError(up.error));

  // A missing thumbnail degrades the list to a placeholder; it must not fail
  // the page upload, which is the part that carries the clinical content.
  let storedThumb = null;
  const thumbUp = await db.storage
    .from(RX_BUCKET)
    .upload(thumbPath, prepared.thumb.blob, { contentType: 'image/jpeg', upsert: true });
  if (!thumbUp.error) storedThumb = thumbPath;

  const row = unwrap(
    await db
      .from('prescription_files')
      .insert(
        prescriptionFileToRow({
          prescriptionId: prescription.id,
          storagePath: fullPath,
          thumbPath: storedThumb,
          mimeType: 'image/jpeg',
          bytes: prepared.full.bytes,
          width: prepared.full.width,
          height: prepared.full.height,
          pageNo,
          checksum: prepared.checksum,
        })
      )
      .select()
      .single()
  );

  return prescriptionFileFromRow(row);
}

/**
 * Open a prescription for viewing.
 *
 * Calls the `open_prescription` RPC, which writes the access-log entry and
 * returns the file rows in the same statement — so viewing a clinical record
 * cannot be done without leaving a trace, rather than relying on the client to
 * log politely.
 */
export async function openPrescriptionFiles(prescriptionId) {
  const db = requireClient();
  const { data, error } = await db.rpc('open_prescription', {
    p_prescription_id: prescriptionId,
  });
  if (error) throw new Error(describeError(error));
  return (data || []).map(prescriptionFileFromRow);
}

/**
 * Short-lived signed URLs for a set of storage paths.
 *
 * 5 minutes: long enough to open and zoom a page, short enough that a URL
 * copied out of devtools or a screenshot is useless by the time it travels.
 * The bucket is private, so this is the only way to read an object.
 */
export async function signPrescriptionPaths(paths, expiresIn = 300) {
  const db = requireClient();
  const wanted = (paths || []).filter(Boolean);
  if (!wanted.length) return {};

  const { data, error } = await db.storage.from(RX_BUCKET).createSignedUrls(wanted, expiresIn);
  if (error) throw new Error(describeError(error));

  const byPath = {};
  (data || []).forEach((entry) => {
    if (entry.signedUrl && !entry.error) byPath[entry.path] = entry.signedUrl;
  });
  return byPath;
}

/** Remove a page's objects and its row. Admin-only by RLS. */
export async function deletePrescriptionFile(file) {
  const db = requireClient();
  const paths = [file.storagePath, file.thumbPath].filter(Boolean);
  if (paths.length) await db.storage.from(RX_BUCKET).remove(paths);
  unwrap(await db.from('prescription_files').delete().eq('id', file.id).select());
  return file.id;
}

/* ===================== appointment ↔ patient ===================== */

/**
 * Past-record summary for a page of appointments, in one round trip.
 *
 * The appointment list needs "has this person been here before?" for every
 * visible row. Asking per row is twenty requests to paint one screen, which on
 * hospital 4G is the difference between a list that appears and one that
 * crawls. Returns `{ [phone]: [candidate, ...] }` — several candidates where a
 * family shares the number.
 */
export async function fetchHistorySummary(phones) {
  const db = requireClient();
  const unique = [...new Set((phones || []).filter(Boolean))];
  if (!unique.length) return {};

  const { data, error } = await db.rpc('patient_history_summary', { p_phones: unique });
  if (error) throw new Error(describeError(error));

  const byPhone = {};
  (data || []).forEach((row) => {
    const entry = {
      id: row.patient_id,
      mrn: row.mrn,
      fullName: row.full_name,
      gender: row.gender,
      age: ageFromPatient(row),
      visitCount: Number(row.visit_count) || 0,
      lastVisit: row.last_visit || null,
    };
    byPhone[row.phone] = [...(byPhone[row.phone] || []), entry];
  });
  return byPhone;
}

/**
 * Attach an appointment to a patient record.
 *
 * Pass `patientId` when staff picked an existing candidate; omit it to register
 * a new patient from the appointment's own name, age and gender. The database
 * function does the patient row, the phone binding and the appointment link in
 * one statement so they cannot half-apply.
 */
export async function linkAppointmentPatient(appointmentId, patientId = null) {
  const db = requireClient();
  const { data, error } = await db.rpc('link_appointment_patient', {
    p_appointment_id: appointmentId,
    p_patient_id: patientId,
  });
  if (error) throw new Error(describeError(error));
  return data; // patient id
}

/** Name, MRN or phone in one search. */
export async function searchPatientRecords(term, limit = 25) {
  const db = requireClient();
  const { data, error } = await db.rpc('search_patient_records', {
    p_term: (term || '').trim(),
    p_limit: limit,
  });
  if (error) throw new Error(describeError(error));

  return (data || []).map((row) => ({
    id: row.patient_id,
    mrn: row.mrn,
    fullName: row.full_name,
    gender: row.gender,
    age: ageFromPatient(row),
    phones: (row.phones || []).map((phone) => ({ phone, isPrimary: false, label: '' })),
    visitCount: Number(row.visit_count) || 0,
    lastVisit: row.last_visit || null,
  }));
}

/**
 * Visit history including why the patient came.
 *
 * Reads `patient_visit_history`, which joins the appointment so the symptoms
 * recorded at booking sit next to what was prescribed. That pairing is most of
 * the clinical value of a history — a prescription without the complaint is
 * hard to interpret a year later.
 */
export async function fetchVisitHistory(patientId, { limit = 10, offset = 0 } = {}) {
  const db = requireClient();
  const { data, error, count } = await db
    .from('patient_visit_history')
    .select('*', { count: 'exact' })
    .eq('patient_id', patientId)
    .order('issued_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(describeError(error));

  // The view carries no files; fetch thumbnails for just this page.
  const ids = (data || []).map((r) => r.prescription_id);
  let filesByRx = {};
  if (ids.length) {
    const { data: files } = await db
      .from('prescription_files')
      .select('id, prescription_id, storage_path, thumb_path, mime_type, bytes, width, height, page_no')
      .in('prescription_id', ids)
      .order('page_no');
    (files || []).forEach((f) => {
      filesByRx[f.prescription_id] = [...(filesByRx[f.prescription_id] || []), prescriptionFileFromRow(f)];
    });
  }

  return {
    items: (data || []).map((row) => ({
      id: row.prescription_id,
      patientId: row.patient_id,
      appointmentId: row.appointment_id || '',
      appointmentRef: row.appointment_ref || '',
      appointmentDate: row.appointment_date || '',
      slot: row.slot || '',
      symptoms: row.symptoms || '',
      issuedAt: row.issued_at,
      notesText: row.notes_text || '',
      ocrStatus: row.ocr_status || 'none',
      doctorId: row.doctor_id || '',
      departmentId: row.department_id || '',
      pageCount: Number(row.page_count) || 0,
      files: filesByRx[row.prescription_id] || [],
    })),
    total: count ?? 0,
  };
}
