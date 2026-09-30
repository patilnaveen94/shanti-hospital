import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Info, UserPlus } from 'lucide-react';

import Modal from '../common/Modal';
import { useBookedSlots } from '../../api/useBookedSlots';
import { selectDoctors } from '../../store/doctorsSlice';
import { selectDepartments } from '../../store/departmentsSlice';
import { selectSettings } from '../../store/settingsSlice';
import { selectUnavailability } from '../../store/unavailabilitySlice';
import { bookAppointment } from '../../store/appointmentsSlice';
import { pushToast } from '../../store/uiSlice';
import { buildSlots, selectableDates, slotMinutesFor } from '../../utils/schedule';
import { toDateKey } from '../../utils/format';

const GENDERS = ['Male', 'Female', 'Other'];

/**
 * Counter registration for a patient who walked in.
 *
 * Differences from the patient-facing flow, all deliberate:
 *  - one screen rather than four steps; the front desk is in a hurry
 *  - defaults to today
 *  - status goes straight to Confirmed (they are standing there)
 *  - `source: 'walkin'` so "how many people booked online" stays answerable
 *
 * It uses the same slot rules as the patient flow, so a walk-in cannot be put
 * into a slot the booking screen believes is taken.
 */
export default function WalkInForm({ open, onClose }) {
  const dispatch = useDispatch();
  const doctors = useSelector(selectDoctors);
  const departments = useSelector(selectDepartments);
  const settings = useSelector(selectSettings);
  const unavailability = useSelector(selectUnavailability);

  const available = useMemo(() => doctors.filter((d) => d.available), [doctors]);

  const [values, setValues] = useState({
    doctorId: '',
    date: toDateKey(new Date()),
    slot: '',
    name: '',
    phone: '',
    age: '',
    gender: '',
    symptoms: '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const doctor = available.find((d) => d.id === values.doctorId);
  const { slots: bookedSlots } = useBookedSlots(values.doctorId, values.date);

  const dates = useMemo(
    () => selectableDates(doctor, { unavailability, horizonDays: settings.bookingHorizonDays }),
    [doctor, unavailability, settings.bookingHorizonDays]
  );

  const slots = useMemo(() => {
    if (!doctor || !values.date) return [];
    return buildSlots(doctor, { bookedSlots, settings });
  }, [doctor, values.date, bookedSlots, settings]);

  const openSlots = slots.filter((s) => !s.taken);

  // Changing doctor invalidates the chosen date and slot.
  useEffect(() => {
    setValues((prev) => ({ ...prev, slot: '' }));
  }, [values.doctorId, values.date]);

  const set = (field) => (event) => {
    const { value } = event.target;
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const found = {};
    if (!values.doctorId) found.doctorId = 'Select a doctor.';
    if (!values.date) found.date = 'Select a date.';
    if (!values.slot) found.slot = 'Select a time slot.';
    if (!values.name.trim() || values.name.trim().length < 3) found.name = 'Enter the patient name.';
    if (values.phone.replace(/\D/g, '').length !== 10) found.phone = 'Enter a 10-digit mobile number.';
    const age = Number(values.age);
    if (!values.age || !Number.isFinite(age) || age < 0 || age > 120) found.age = 'Enter a valid age.';
    if (!values.gender) found.gender = 'Select a gender.';
    return found;
  };

  const submit = async (event) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    const saved = await dispatch(
      bookAppointment({
        doctorId: doctor.id,
        departmentId: doctor.departmentId,
        date: values.date,
        slot: values.slot,
        source: 'walkin',
        status: 'Confirmed',
        patient: {
          name: values.name,
          phone: values.phone,
          age: values.age,
          gender: values.gender,
          symptoms: values.symptoms,
        },
      })
    );
    setBusy(false);

    if (!saved) return; // error toast already shown
    dispatch(pushToast(`Walk-in registered · ${saved.refId}`, 'success'));
    onClose();
  };

  const departmentName = departments.find((d) => d.id === doctor?.departmentId)?.name;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Register a walk-in"
      subtitle="For patients at the counter — saved as Confirmed"
      size="lg"
      closeOnBackdrop={false}
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" form="walkin-form" disabled={busy} className="btn-primary flex-1">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {busy ? 'Saving…' : 'Register walk-in'}
          </button>
        </div>
      }
    >
      <form id="walkin-form" onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="w-doctor">Doctor *</label>
            <select id="w-doctor" className={`select ${errors.doctorId ? 'input-error' : ''}`} value={values.doctorId} onChange={set('doctorId')}>
              <option value="">Select a doctor</option>
              {available.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {departments.find((x) => x.id === d.departmentId)?.name || 'Unassigned'}
                </option>
              ))}
            </select>
            {errors.doctorId && <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.doctorId}</p>}
            {doctor && departmentName && (
              <p className="mt-1.5 text-[12px] text-slate-500">
                {departmentName} · {slotMinutesFor(doctor, settings)}-minute slots
              </p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="w-date">Date *</label>
            <select id="w-date" className={`select ${errors.date ? 'input-error' : ''}`} value={values.date} onChange={set('date')} disabled={!doctor}>
              {!doctor && <option value="">Select a doctor first</option>}
              {dates.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.isToday ? 'Today' : d.isTomorrow ? 'Tomorrow' : `${d.weekday} ${d.day} ${d.month}`}
                </option>
              ))}
            </select>
            {doctor && !dates.length && (
              <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">
                No open OPD dates — this doctor is on leave.
              </p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="w-slot">Time *</label>
            <select id="w-slot" className={`select ${errors.slot ? 'input-error' : ''}`} value={values.slot} onChange={set('slot')} disabled={!doctor || !openSlots.length}>
              <option value="">{openSlots.length ? 'Select a time' : 'No free slots'}</option>
              {openSlots.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {errors.slot && <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.slot}</p>}
            {doctor && slots.length > 0 && (
              <p className="mt-1.5 text-[12px] text-slate-500">
                {openSlots.length} of {slots.length} slots free
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="w-name">Patient name *</label>
            <input id="w-name" className={`input ${errors.name ? 'input-error' : ''}`} value={values.name} onChange={set('name')} placeholder="Full name" />
            {errors.name && <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.name}</p>}
          </div>

          <div>
            <label className="label" htmlFor="w-phone">Mobile *</label>
            <input id="w-phone" type="tel" inputMode="numeric" maxLength={10} className={`input ${errors.phone ? 'input-error' : ''}`} value={values.phone} onChange={set('phone')} placeholder="10-digit number" />
            {errors.phone && <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.phone}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="w-age">Age *</label>
              <input id="w-age" type="number" min="0" max="120" className={`input ${errors.age ? 'input-error' : ''}`} value={values.age} onChange={set('age')} />
              {errors.age && <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.age}</p>}
            </div>
            <div>
              <label className="label" htmlFor="w-gender">Gender *</label>
              <select id="w-gender" className={`select ${errors.gender ? 'input-error' : ''}`} value={values.gender} onChange={set('gender')}>
                <option value="">Select</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              {errors.gender && <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.gender}</p>}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="w-symptoms">Reason for visit</label>
            <textarea id="w-symptoms" rows={2} maxLength={500} className="textarea" value={values.symptoms} onChange={set('symptoms')} placeholder="Brief note for the consultant." />
          </div>
        </div>

        <p className="flex items-start gap-2 rounded-xl bg-primary-50 p-3 text-[12px] leading-snug text-primary-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden="true" />
          Walk-ins are saved as <strong>Confirmed</strong> and occupy a real slot, so the patient booking screen
          stays accurate. If every slot is taken, pick the next available time and tell the patient the wait.
        </p>
      </form>
    </Modal>
  );
}
