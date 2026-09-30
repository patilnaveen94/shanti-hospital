import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Check } from 'lucide-react';

import Modal from '../common/Modal';
import StepDepartment from './StepDepartment';
import StepDoctor from './StepDoctor';
import StepSlot from './StepSlot';
import StepDetails from './StepDetails';
import StepSuccess from './StepSuccess';

import { selectDepartments } from '../../store/departmentsSlice';
import { selectDoctors } from '../../store/doctorsSlice';
import { bookAppointment } from '../../store/appointmentsSlice';
import {
  bookingConfirmed,
  closeBooking,
  pushToast,
  selectBooking,
  setBookingStep,
} from '../../store/uiSlice';

/** Wizard order. `success` is terminal and has no back step. */
const STEPS = ['department', 'doctor', 'slot', 'details'];

const STEP_META = {
  department: { title: 'Choose a department', subtitle: 'Step 1 of 4' },
  doctor: { title: 'Choose a doctor', subtitle: 'Step 2 of 4' },
  slot: { title: 'Pick date & time', subtitle: 'Step 3 of 4' },
  details: { title: 'Patient details', subtitle: 'Step 4 of 4' },
  success: { title: 'Appointment requested', subtitle: 'Save your reference number' },
};

function ProgressRail({ step }) {
  const currentIndex = STEPS.indexOf(step);
  if (currentIndex < 0) return null;

  return (
    <ol className="mb-5 flex items-center gap-1.5" aria-label="Booking progress">
      {STEPS.map((key, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        return (
          <li key={key} className="flex flex-1 items-center gap-1.5">
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors duration-300 ${
                done
                  ? 'bg-mint-500 text-white'
                  : current
                    ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                    : 'bg-slate-200 text-slate-500'
              }`}
              aria-current={current ? 'step' : undefined}
            >
              {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
            </span>
            {index < STEPS.length - 1 && (
              <span
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${done ? 'bg-mint-400' : 'bg-slate-200'}`}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Four-step appointment wizard rendered inside a bottom-sheet modal.
 *
 * Wizard *selections* live in Redux (so a doctor card can deep-link into
 * step 3), while the patient-details form keeps its own local state until
 * submission — no need to re-render the app on every keystroke.
 */
export default function BookingModal() {
  const dispatch = useDispatch();
  const booking = useSelector(selectBooking);
  const departments = useSelector(selectDepartments);
  const doctors = useSelector(selectDoctors);
  const [submitting, setSubmitting] = useState(false);

  const doctor = useMemo(() => doctors.find((d) => d.id === booking.doctorId), [doctors, booking.doctorId]);
  const department = useMemo(
    () => departments.find((d) => d.id === (doctor?.departmentId || booking.departmentId)),
    [departments, doctor, booking.departmentId]
  );

  if (!booking.open) return null;

  const meta = STEP_META[booking.step] || STEP_META.department;
  const canGoBack = booking.step !== 'department' && booking.step !== 'success';

  const goBack = () => {
    const index = STEPS.indexOf(booking.step);
    if (index > 0) dispatch(setBookingStep(STEPS[index - 1]));
  };

  /**
   * Booking is async now: the reference number shown to the patient must be the
   * one the database actually stored. In cloud mode the write can legitimately
   * fail — if two people confirm the same slot, the unique index rejects the
   * loser — so we only advance to the success step once it is persisted.
   */
  const handleSubmit = async (patient) => {
    setSubmitting(true);
    const saved = await dispatch(
      bookAppointment({
        doctorId: doctor.id,
        departmentId: doctor.departmentId,
        date: booking.date,
        slot: booking.slot,
        patient,
      })
    );
    setSubmitting(false);

    // Failure already surfaced a toast; keep the form open so nothing is lost.
    if (!saved) return;

    dispatch(bookingConfirmed({ refId: saved.refId, patientName: saved.patient.name }));
    dispatch(pushToast(`Appointment ${saved.refId} requested`, 'success'));
  };

  return (
    <Modal
      open={booking.open}
      onClose={() => dispatch(closeBooking())}
      title={meta.title}
      subtitle={meta.subtitle}
      size="md"
      closeOnBackdrop={booking.step !== 'details'}
    >
      {canGoBack && (
        <button
          type="button"
          onClick={goBack}
          className="btn-ghost btn-sm -ml-2 mb-3 !min-h-[36px] !px-2 text-[13px]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>
      )}

      {booking.step !== 'success' && <ProgressRail step={booking.step} />}

      {booking.step === 'department' && <StepDepartment />}
      {booking.step === 'doctor' && <StepDoctor departmentId={booking.departmentId} />}
      {booking.step === 'slot' && <StepSlot doctor={doctor} department={department} booking={booking} />}
      {booking.step === 'details' && (
        <StepDetails
          doctor={doctor}
          department={department}
          booking={booking}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      )}
      {booking.step === 'success' && (
        <StepSuccess refId={booking.confirmedRef} doctor={doctor} department={department} booking={booking} />
      )}
    </Modal>
  );
}
