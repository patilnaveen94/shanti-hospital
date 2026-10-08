/**
 * Translation between Postgres rows (snake_case, SQL types) and the shapes the
 * React components already consume (camelCase).
 *
 * Keeping this in one file means the existing components and selectors did not
 * have to change when the backend arrived.
 */

/** `14:00:00` → `14:00` — the UI works in HH:mm throughout. */
function toHm(value) {
  if (!value) return '';
  return String(value).slice(0, 5);
}

/* ---------------- departments ---------------- */

export function departmentFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    group: row.group || 'Adult',
    icon: row.icon || 'Stethoscope',
    accent: row.accent || 'blue',
    description: row.description || '',
    services: row.services || [],
    isNew: Boolean(row.is_new),
  };
}

export function departmentToRow(d, index = 0) {
  return {
    id: d.id,
    name: d.name,
    group: d.group || 'Adult',
    icon: d.icon || 'Stethoscope',
    accent: d.accent || 'blue',
    description: d.description || '',
    services: d.services || [],
    is_new: Boolean(d.isNew),
    sort_order: index,
  };
}

/* ---------------- doctors ---------------- */

export function doctorFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    departmentId: row.department_id || '',
    specialization: row.specialization || '',
    qualification: row.qualification || '',
    experience: Number(row.experience) || 0,
    photo: row.photo || '',
    opdDays: row.opd_days || [],
    opdStart: toHm(row.opd_start),
    opdEnd: toHm(row.opd_end),
    // null means "use the hospital default", so don't coerce it to 0.
    slotMinutes: row.slot_minutes == null ? null : Number(row.slot_minutes),
    fee: Number(row.fee) || 0,
    languages: row.languages || [],
    about: row.about || '',
    available: row.available !== false,
    showFee: row.show_fee !== false,
  };
}

export function doctorToRow(d, index = 0) {
  return {
    id: d.id,
    name: d.name,
    department_id: d.departmentId || null,
    specialization: d.specialization || '',
    qualification: d.qualification || '',
    experience: Number(d.experience) || 0,
    photo: d.photo || '',
    opd_days: d.opdDays || [],
    opd_start: d.opdStart || '10:00',
    opd_end: d.opdEnd || '14:00',
    slot_minutes: d.slotMinutes ? Number(d.slotMinutes) : null,
    fee: Number(d.fee) || 0,
    languages: d.languages || [],
    about: d.about || '',
    available: d.available !== false,
    show_fee: d.showFee !== false,
    sort_order: index,
  };
}

/* ---------------- announcements ---------------- */

export function announcementFromRow(row) {
  return {
    id: row.id,
    title: row.title,
    message: row.message || '',
    type: row.type || 'info',
    image: row.image || '',
    pinned: Boolean(row.pinned),
    active: row.active !== false,
    createdAt: row.created_at,
  };
}

export function announcementToRow(a) {
  const row = {
    title: a.title,
    message: a.message || '',
    type: a.type || 'info',
    image: a.image || '',
    pinned: Boolean(a.pinned),
    active: a.active !== false,
  };
  // Let Postgres generate the uuid for new rows; seeded rows keep created_at.
  if (a.createdAt) row.created_at = a.createdAt;
  return row;
}

/* ---------------- appointments ---------------- */

/* ---------------- hospital settings ---------------- */

export function settingsFromRow(row) {
  return {
    showConsultationFees: row.show_consultation_fees !== false,
    defaultSlotMinutes: Number(row.default_slot_minutes) || 20,
    bookingHorizonDays: Number(row.booking_horizon_days) || 60,
    whatsappEnabled: row.whatsapp_enabled !== false,
    notifyOnConfirm: row.notify_on_confirm !== false,
    notifyOnCancel: row.notify_on_cancel !== false,
    /*
     * Explicit `=== true`, unlike the two above. The visit summary is opt-in:
     * a null column (updates-04.sql not yet run) or a false value both mean
     * "do not send". Reading it as `!== false` would have turned it on for
     * every hospital the moment the migration landed.
     */
    notifyOnComplete: row.notify_on_complete === true,
    // Null until updates-02/04.sql run; the slice then falls back to defaults.
    whatsappConfirmedBody: row.whatsapp_confirmed_body || '',
    whatsappCancelledBody: row.whatsapp_cancelled_body || '',
    whatsappCompletedBody: row.whatsapp_completed_body || '',
  };
}

/** Only maps keys actually present, so a partial update stays partial. */
export function settingsToRow(changes) {
  const row = {};
  if ('showConsultationFees' in changes) row.show_consultation_fees = Boolean(changes.showConsultationFees);
  if ('defaultSlotMinutes' in changes) row.default_slot_minutes = Number(changes.defaultSlotMinutes);
  if ('bookingHorizonDays' in changes) row.booking_horizon_days = Number(changes.bookingHorizonDays);
  if ('whatsappEnabled' in changes) row.whatsapp_enabled = Boolean(changes.whatsappEnabled);
  if ('notifyOnConfirm' in changes) row.notify_on_confirm = Boolean(changes.notifyOnConfirm);
  if ('notifyOnCancel' in changes) row.notify_on_cancel = Boolean(changes.notifyOnCancel);
  if ('notifyOnComplete' in changes) row.notify_on_complete = Boolean(changes.notifyOnComplete);
  if ('whatsappConfirmedBody' in changes) row.whatsapp_confirmed_body = changes.whatsappConfirmedBody;
  if ('whatsappCancelledBody' in changes) row.whatsapp_cancelled_body = changes.whatsappCancelledBody;
  if ('whatsappCompletedBody' in changes) row.whatsapp_completed_body = changes.whatsappCompletedBody;
  return row;
}

/* ---------------- doctor unavailability ---------------- */

export function unavailabilityFromRow(row) {
  return {
    id: row.id,
    doctorId: row.doctor_id,
    fromDate: row.from_date,
    toDate: row.to_date,
    reason: row.reason || '',
    createdAt: row.created_at,
  };
}

export function unavailabilityToRow(block) {
  return {
    doctor_id: block.doctorId,
    from_date: block.fromDate,
    to_date: block.toDate || block.fromDate,
    reason: block.reason || '',
  };
}

/* ---------------- testimonials ---------------- */

export function testimonialFromRow(row) {
  return {
    id: row.id,
    authorName: row.author_name,
    authorRole: row.author_role || '',
    quote: row.quote,
    photo: row.photo || '',
    // Absent when read through the public view, which is the point.
    contactPhone: row.contact_phone || '',
    rating: row.rating ?? null,
    status: row.status || 'approved',
    reviewNote: row.review_note || '',
    createdAt: row.created_at,
  };
}

export function testimonialToRow(t) {
  return {
    author_name: t.authorName,
    author_role: t.authorRole || '',
    quote: t.quote,
    photo: t.photo || '',
    contact_phone: t.contactPhone || '',
    rating: t.rating || null,
    // Never sent from the client as anything else; RLS also enforces it.
    status: 'pending',
  };
}

/* ---------------- appointments ---------------- */

export function appointmentFromRow(row) {
  return {
    id: row.id,
    refId: row.ref_id,
    doctorId: row.doctor_id || '',
    departmentId: row.department_id || '',
    date: row.appointment_date,
    slot: toHm(row.slot),
    source: row.source || 'online',
    patient: {
      name: row.patient_name,
      phone: row.patient_phone,
      age: String(row.patient_age ?? ''),
      gender: row.patient_gender || '',
      symptoms: row.symptoms || '',
    },
    status: row.status || 'Pending',
    createdAt: row.created_at,
  };
}

export function appointmentToRow(a) {
  return {
    ref_id: a.refId,
    doctor_id: a.doctorId || null,
    department_id: a.departmentId || null,
    appointment_date: a.date,
    slot: a.slot,
    source: a.source || 'online',
    patient_name: a.patient.name,
    patient_phone: String(a.patient.phone || '').replace(/\D/g, ''),
    patient_age: Number(a.patient.age) || 0,
    patient_gender: a.patient.gender,
    symptoms: a.patient.symptoms || '',
    status: a.status || 'Pending',
  };
}

/* ---------------- patients ---------------- */

/**
 * Age is derived from `date_of_birth` when present and only falls back to the
 * stored `age_years`. A stored age is wrong within a year of being entered,
 * which matters when it feeds a dosing decision.
 */
export function ageFromPatient(row) {
  if (row?.date_of_birth) {
    const dob = new Date(`${row.date_of_birth}T00:00:00`);
    if (!Number.isNaN(dob.getTime())) {
      const now = new Date();
      let years = now.getFullYear() - dob.getFullYear();
      const monthDelta = now.getMonth() - dob.getMonth();
      if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) years -= 1;
      return Math.max(0, years);
    }
  }
  return row?.age_years ?? null;
}

export function patientFromRow(row) {
  return {
    id: row.id,
    mrn: row.mrn,
    fullName: row.full_name,
    dateOfBirth: row.date_of_birth || '',
    ageYears: row.age_years ?? null,
    age: ageFromPatient(row),
    gender: row.gender,
    notes: row.notes || '',
    phones: (row.patient_phones || []).map((p) => ({
      phone: p.phone,
      isPrimary: Boolean(p.is_primary),
      label: p.label || '',
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function patientToRow(patient) {
  const row = {
    full_name: (patient.fullName || '').trim(),
    gender: patient.gender,
    notes: (patient.notes || '').trim(),
  };
  // Send only the age source that was actually supplied; the table's
  // `patients_age_known` constraint requires at least one.
  if (patient.dateOfBirth) row.date_of_birth = patient.dateOfBirth;
  else row.date_of_birth = null;
  row.age_years = patient.ageYears == null || patient.ageYears === '' ? null : Number(patient.ageYears);
  return row;
}

/** Row shape returned by the `find_patients_by_phone` RPC. */
export function patientCandidateFromRow(row) {
  return {
    id: row.id,
    mrn: row.mrn,
    fullName: row.full_name,
    gender: row.gender,
    age: ageFromPatient(row),
    phoneLabel: row.phone_label || '',
    lastVisit: row.last_visit || null,
    visitCount: Number(row.visit_count) || 0,
  };
}

/* ---------------- prescriptions ---------------- */

export function prescriptionFromRow(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    appointmentId: row.appointment_id || '',
    doctorId: row.doctor_id || '',
    departmentId: row.department_id || '',
    issuedAt: row.issued_at,
    notesText: row.notes_text || '',
    // Machine-extracted and UNVERIFIED. Never render this as the
    // prescription itself — see messageTemplates-style note in updates-05.sql.
    ocrText: row.ocr_text || '',
    ocrStatus: row.ocr_status || 'none',
    ocrConfidence: row.ocr_confidence == null ? null : Number(row.ocr_confidence),
    ocrError: row.ocr_error || '',
    createdBy: row.created_by || '',
    createdAt: row.created_at,
    // Present when the query joined files; the history list selects only
    // the thumbnail columns it needs.
    files: (row.prescription_files || []).map(prescriptionFileFromRow),
    pageCount: row.page_count ?? (row.prescription_files || []).length,
  };
}

export function prescriptionToRow(rx) {
  return {
    patient_id: rx.patientId,
    appointment_id: rx.appointmentId || null,
    doctor_id: rx.doctorId || null,
    department_id: rx.departmentId || null,
    issued_at: rx.issuedAt || new Date().toISOString(),
    notes_text: (rx.notesText || '').trim(),
    // `queued` only when there is an image to read and the hospital has
    // switched OCR on; the app decides, not this mapper.
    ocr_status: rx.ocrStatus || 'none',
  };
}

export function prescriptionFileFromRow(row) {
  return {
    id: row.id || row.file_id,
    prescriptionId: row.prescription_id || '',
    storagePath: row.storage_path,
    thumbPath: row.thumb_path || '',
    mimeType: row.mime_type,
    bytes: Number(row.bytes) || 0,
    width: row.width ?? null,
    height: row.height ?? null,
    pageNo: Number(row.page_no) || 1,
    checksum: row.checksum || '',
  };
}

export function prescriptionFileToRow(file) {
  return {
    prescription_id: file.prescriptionId,
    storage_path: file.storagePath,
    thumb_path: file.thumbPath || null,
    mime_type: file.mimeType,
    bytes: file.bytes,
    width: file.width ?? null,
    height: file.height ?? null,
    page_no: file.pageNo,
    checksum: file.checksum || null,
  };
}
