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
    // Null until updates-04.sql runs, and `!== false` means the thank-you
    // defaults to on rather than being silently disabled by a missing column.
    notifyOnComplete: row.notify_on_complete !== false,
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
