/**
 * Fee visibility.
 *
 * Two switches, ANDed:
 *   - `hospital_settings.show_consultation_fees` — the master, hospital-wide
 *   - `doctors.show_fee` — per consultant
 *
 * The master wins: turning it off hides every fee regardless of the per-doctor
 * flag. That way "hide all fees" is one action rather than 29, and a newly
 * added doctor cannot accidentally publish a fee while the hospital policy is
 * to keep them private.
 *
 * Staff screens deliberately ignore this and always show fees — the front desk
 * needs the number to take payment.
 */
export function isFeeVisible(doctor, settings) {
  if (!settings?.showConsultationFees) return false;
  // Absent flag means visible, so existing rows keep working before
  // updates-02.sql has been run.
  return doctor?.showFee !== false;
}

/** How many doctors are individually hidden, for the admin summary line. */
export function countHiddenFees(doctors = []) {
  return doctors.filter((d) => d.showFee === false).length;
}
