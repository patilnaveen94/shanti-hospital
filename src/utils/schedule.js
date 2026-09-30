/**
 * Scheduling rules, in one place.
 *
 * Both the patient booking screen and the admin walk-in form need the same
 * answer to "can this doctor be seen on this date, and at what times?". Keeping
 * the logic here stops the two drifting apart — which would show a slot to a
 * patient that the counter believes is unavailable.
 */

import { toDateKey, upcomingDays } from './format';

export const SLOT_OPTIONS = [5, 10, 15, 20, 30, 45, 60];

export const DEFAULT_SLOT_MINUTES = 20;

/** Slot length for a doctor, falling back to the hospital default. */
export function slotMinutesFor(doctor, settings) {
  const perDoctor = Number(doctor?.slotMinutes);
  if (SLOT_OPTIONS.includes(perDoctor)) return perDoctor;

  const fallback = Number(settings?.defaultSlotMinutes);
  if (SLOT_OPTIONS.includes(fallback)) return fallback;

  return DEFAULT_SLOT_MINUTES;
}

/** `10:00` → 600 */
function toMinutes(hhmm) {
  const [h, m = '0'] = String(hhmm || '').split(':');
  const hours = Number(h);
  const mins = Number(m);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return NaN;
  return hours * 60 + mins;
}

/** 600 → `10:00` */
function fromMinutes(total) {
  const hh = `${Math.floor(total / 60)}`.padStart(2, '0');
  const mm = `${total % 60}`.padStart(2, '0');
  return `${hh}:${mm}`;
}

export function to12h(hhmm = '') {
  const [hStr, mStr = '00'] = String(hhmm).split(':');
  let h = Number(hStr);
  if (Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mStr} ${period}`;
}

/**
 * Consultation slots across a doctor's OPD window.
 *
 * `taken` slots are returned flagged rather than removed, so patients can see
 * the clinic filling up instead of wondering why a doctor looks unavailable.
 */
export function buildSlots(doctor, { bookedSlots = [], settings, includeTaken = true } = {}) {
  if (!doctor?.opdStart || !doctor?.opdEnd) return [];

  const start = toMinutes(doctor.opdStart);
  const end = toMinutes(doctor.opdEnd);
  const step = slotMinutesFor(doctor, settings);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];

  const taken = new Set(bookedSlots);
  const slots = [];

  for (let t = start; t + step <= end; t += step) {
    const value = fromMinutes(t);
    const isTaken = taken.has(value);
    if (isTaken && !includeTaken) continue;
    slots.push({ value, label: to12h(value), taken: isTaken, minutes: step });
  }

  return slots;
}

/* ===================== unavailability ===================== */

/**
 * Is a doctor blocked on a date?
 * Returns the matching block (so the reason can be shown) or null.
 */
export function blockOn(unavailability, doctorId, dateKey) {
  if (!doctorId || !dateKey) return null;
  return (
    (unavailability || []).find(
      (u) => u.doctorId === doctorId && dateKey >= u.fromDate && dateKey <= u.toDate
    ) || null
  );
}

/** Every blocked date key for a doctor, as a Set — handy for fast lookups. */
export function blockedDateSet(unavailability, doctorId) {
  const out = new Set();
  (unavailability || [])
    .filter((u) => u.doctorId === doctorId)
    .forEach((u) => {
      const cursor = new Date(`${u.fromDate}T00:00:00`);
      const last = new Date(`${u.toDate}T00:00:00`);
      // Guard against a malformed range producing an unbounded loop.
      let guard = 0;
      while (cursor <= last && guard < 400) {
        out.add(toDateKey(cursor));
        cursor.setDate(cursor.getDate() + 1);
        guard += 1;
      }
    });
  return out;
}

/**
 * Selectable dates for a doctor: the recurring OPD pattern, minus blocked
 * dates, within the hospital's booking horizon.
 *
 * Blocked days are dropped entirely rather than shown disabled — a patient
 * does not need to know why a consultant is away, and a long grey row of
 * unexplained dates reads as a broken screen.
 */
export function selectableDates(doctor, { unavailability = [], horizonDays = 60 } = {}) {
  if (!doctor) return [];
  const opdDays = doctor.opdDays || [];
  if (!opdDays.length) return [];

  const blocked = blockedDateSet(unavailability, doctor.id);

  return upcomingDays(Math.min(Math.max(horizonDays, 1), 90))
    .filter((day) => opdDays.includes(day.weekday))
    .filter((day) => !blocked.has(day.key));
}

/** How many of a doctor's normal OPD days the next `days` days actually offer. */
export function countBlockedUpcoming(doctor, unavailability, days = 60) {
  if (!doctor) return 0;
  const opdDays = doctor.opdDays || [];
  const blocked = blockedDateSet(unavailability, doctor.id);
  return upcomingDays(days).filter((d) => opdDays.includes(d.weekday) && blocked.has(d.key)).length;
}

/** `2026-10-10` + `2026-10-14` → `10 – 14 Oct 2026`; single days collapse. */
export function formatRange(fromDate, toDate) {
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return `${fromDate} – ${toDate}`;

  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  if (fromDate === toDate) return from.toLocaleDateString('en-IN', opts);

  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  if (sameMonth) {
    return `${from.getDate()} – ${to.toLocaleDateString('en-IN', opts)}`;
  }
  return `${from.toLocaleDateString('en-IN', opts)} – ${to.toLocaleDateString('en-IN', opts)}`;
}

/** Inclusive day count for a range. */
export function rangeLength(fromDate, toDate) {
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  return Math.round((to - from) / 86400000) + 1;
}
