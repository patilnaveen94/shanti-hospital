import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CalendarOff, CalendarPlus, Phone, Trash2, TriangleAlert } from 'lucide-react';

import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';
import { EmptyState } from '../common/Bits';
import { isCloudMode } from '../../api/client';
import { fetchClashingAppointments } from '../../api/repository';
import { selectDoctors } from '../../store/doctorsSlice';
import { selectAppointments } from '../../store/appointmentsSlice';
import { addUnavailability, removeUnavailability, selectUnavailability } from '../../store/unavailabilitySlice';
import { pushToast } from '../../store/uiSlice';
import { formatRange, rangeLength, to12h } from '../../utils/schedule';
import { formatShortDate, toDateKey } from '../../utils/format';

const today = () => toDateKey(new Date());

/**
 * Leave / blocked-date form.
 *
 * The important behaviour: before saving, it looks for appointments already
 * booked inside the range and shows them. Blocking a date silently would leave
 * those patients expecting a consultation that will not happen — so staff get
 * names and phone numbers to call.
 */
function LeaveForm({ open, onClose, doctors, onSave }) {
  const dispatch = useDispatch();
  const localAppointments = useSelector(selectAppointments);

  const [values, setValues] = useState({
    doctorId: doctors[0]?.id || '',
    fromDate: today(),
    toDate: today(),
    reason: '',
  });
  const [clashes, setClashes] = useState([]);
  const [checking, setChecking] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (field) => (event) => {
    const { value } = event.target;
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      // Keep the range valid as the user types.
      if (field === 'fromDate' && next.toDate < value) next.toDate = value;
      return next;
    });
  };

  // Look for clashing appointments whenever the doctor or range changes.
  useEffect(() => {
    const { doctorId, fromDate, toDate } = values;
    if (!doctorId || !fromDate || !toDate || toDate < fromDate) {
      setClashes([]);
      return undefined;
    }

    let cancelled = false;
    setChecking(true);

    const run = async () => {
      if (isCloudMode) {
        const rows = await fetchClashingAppointments(doctorId, fromDate, toDate);
        if (!cancelled) setClashes(rows);
      } else {
        const rows = localAppointments
          .filter(
            (a) =>
              a.doctorId === doctorId &&
              a.date >= fromDate &&
              a.date <= toDate &&
              ['Pending', 'Confirmed'].includes(a.status)
          )
          .map((a) => ({
            refId: a.refId,
            date: a.date,
            slot: a.slot,
            patientName: a.patient.name,
            patientPhone: a.patient.phone,
            status: a.status,
          }));
        if (!cancelled) setClashes(rows);
      }
      if (!cancelled) setChecking(false);
    };

    // Small debounce so dragging a date picker does not spam the database.
    const timer = setTimeout(run, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [values, localAppointments]);

  const submit = (event) => {
    event.preventDefault();
    const found = {};
    if (!values.doctorId) found.doctorId = 'Select a doctor.';
    if (!values.fromDate) found.fromDate = 'Start date is required.';
    if (!values.toDate) found.toDate = 'End date is required.';
    if (values.toDate && values.fromDate && values.toDate < values.fromDate) {
      found.toDate = 'End date cannot be before the start date.';
    }
    setErrors(found);
    if (Object.keys(found).length) return;

    onSave(values);
    if (clashes.length) {
      dispatch(
        pushToast(`Blocked. ${clashes.length} existing appointment(s) need a call.`, 'info')
      );
    }
    onClose();
  };

  const days = rangeLength(values.fromDate, values.toDate);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Block dates"
      subtitle="Leave, conference or any day the doctor is unavailable"
      closeOnBackdrop={false}
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" form="leave-form" className="btn-primary flex-1">
            Block {days > 1 ? `${days} days` : 'this day'}
          </button>
        </div>
      }
    >
      <form id="leave-form" onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label className="label" htmlFor="leave-doctor">Doctor *</label>
          <select id="leave-doctor" className={`select ${errors.doctorId ? 'input-error' : ''}`} value={values.doctorId} onChange={set('doctorId')}>
            <option value="">Select a doctor</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          {errors.doctorId && <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.doctorId}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="leave-from">From *</label>
            <input id="leave-from" type="date" min={today()} className={`input ${errors.fromDate ? 'input-error' : ''}`} value={values.fromDate} onChange={set('fromDate')} />
          </div>
          <div>
            <label className="label" htmlFor="leave-to">To *</label>
            <input id="leave-to" type="date" min={values.fromDate || today()} className={`input ${errors.toDate ? 'input-error' : ''}`} value={values.toDate} onChange={set('toDate')} />
            {errors.toDate && <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.toDate}</p>}
          </div>
        </div>

        <p className="text-[12px] text-slate-500">
          Same date in both fields blocks a single day. These dates disappear from the patient booking screen.
        </p>

        <div>
          <label className="label" htmlFor="leave-reason">Reason <span className="font-normal text-slate-400">(internal)</span></label>
          <input id="leave-reason" className="input" value={values.reason} onChange={set('reason')} placeholder="e.g. Conference, personal leave" maxLength={120} />
        </div>

        {/* Clash warning — the operationally important part */}
        {checking && <p className="text-[12.5px] text-slate-500">Checking existing appointments…</p>}

        {!checking && clashes.length > 0 && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <p className="flex items-start gap-2 text-[13px] font-bold text-amber-900">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              {clashes.length} appointment{clashes.length === 1 ? '' : 's'} already booked in this range
            </p>
            <p className="mt-1 pl-6 text-[12.5px] leading-relaxed text-amber-900/90">
              Blocking these dates does not cancel them. Please call these patients to reschedule.
            </p>

            <ul className="mt-3 space-y-1.5">
              {clashes.slice(0, 8).map((c) => (
                <li key={c.refId} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg bg-white px-3 py-2 text-[12px]">
                  <span className="font-mono font-bold text-primary-700">{c.refId}</span>
                  <span className="font-semibold text-slate-800">{c.patientName}</span>
                  <span className="text-slate-500">
                    {formatShortDate(c.date)} · {to12h(c.slot)}
                  </span>
                  <a href={`tel:${c.patientPhone}`} className="ml-auto inline-flex items-center gap-1 font-bold text-primary-700 hover:underline">
                    <Phone className="h-3 w-3" aria-hidden="true" />
                    {c.patientPhone}
                  </a>
                </li>
              ))}
            </ul>

            {clashes.length > 8 && (
              <p className="mt-2 pl-6 text-[12px] text-amber-900/80">…and {clashes.length - 8} more.</p>
            )}
          </div>
        )}

        {!checking && clashes.length === 0 && values.doctorId && (
          <p className="rounded-xl bg-mint-50 px-3.5 py-2.5 text-[12.5px] font-medium text-mint-800">
            No existing appointments in this range.
          </p>
        )}
      </form>
    </Modal>
  );
}

/** Admin view of doctor leave and blocked dates. */
export default function AvailabilityManager() {
  const dispatch = useDispatch();
  const doctors = useSelector(selectDoctors);
  const unavailability = useSelector(selectUnavailability);

  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [doctorFilter, setDoctorFilter] = useState('all');

  const doctorName = (id) => doctors.find((d) => d.id === id)?.name || 'Unknown doctor';

  // Past blocks are noise once they have elapsed; keep them out by default.
  const rows = useMemo(() => {
    const todayKey = today();
    return unavailability
      .filter((u) => u.toDate >= todayKey)
      .filter((u) => doctorFilter === 'all' || u.doctorId === doctorFilter)
      .slice()
      .sort((a, b) => a.fromDate.localeCompare(b.fromDate));
  }, [unavailability, doctorFilter]);

  const pastCount = unavailability.filter((u) => u.toDate < today()).length;

  return (
    <section>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl">Doctor availability</h2>
          <p className="mt-0.5 text-[13.5px] text-slate-500">
            {rows.length} upcoming block{rows.length === 1 ? '' : 's'}
            {pastCount > 0 && ` · ${pastCount} past (hidden)`}
          </p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="btn-primary btn-sm">
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          Block dates
        </button>
      </header>

      <div className="mb-4">
        <select
          value={doctorFilter}
          onChange={(e) => setDoctorFilter(e.target.value)}
          aria-label="Filter by doctor"
          className="select sm:w-72"
        >
          <option value="all">All doctors</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="mb-4 rounded-xl bg-slate-50 p-3.5 text-[12.5px] leading-relaxed text-slate-600">
        <strong className="font-bold text-slate-800">How this works.</strong> A doctor&apos;s OPD days set the
        recurring pattern. Blocking dates here removes specific days from that pattern, so they never appear on
        the patient booking screen. To stop bookings entirely and indefinitely, switch the doctor to{' '}
        <em>on leave</em> under Doctors instead.
      </div>

      {!rows.length ? (
        <EmptyState
          icon={CalendarOff}
          title="No upcoming blocked dates"
          description="Every doctor is bookable on their normal OPD days. Use Block dates for leave, conferences or holidays."
        />
      ) : (
        <ul className="space-y-2.5">
          {rows.map((block) => {
            const days = rangeLength(block.fromDate, block.toDate);
            return (
              <li key={block.id} className="card flex items-start gap-3.5 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
                  <CalendarOff className="h-5 w-5" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug text-slate-900">{doctorName(block.doctorId)}</p>
                  <p className="mt-0.5 text-[13px] font-medium text-slate-700">
                    {formatRange(block.fromDate, block.toDate)}
                    <span className="ml-1.5 text-slate-400">
                      ({days} day{days === 1 ? '' : 's'})
                    </span>
                  </p>
                  {block.reason && <p className="mt-1 text-[12.5px] text-slate-500">{block.reason}</p>}
                </div>

                <button
                  type="button"
                  onClick={() => setPendingDelete(block)}
                  aria-label={`Remove block for ${doctorName(block.doctorId)}`}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-danger-200 text-danger-600 transition-colors hover:bg-danger-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {creating && (
        <LeaveForm
          open
          onClose={() => setCreating(false)}
          doctors={doctors}
          onSave={(values) => {
            dispatch(addUnavailability(values));
            dispatch(pushToast('Dates blocked', 'success'));
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          dispatch(removeUnavailability(pendingDelete.id));
          dispatch(pushToast('Block removed — these dates are bookable again', 'info'));
        }}
        title="Remove this block?"
        message={
          pendingDelete
            ? `${doctorName(pendingDelete.doctorId)} will become bookable again on ${formatRange(pendingDelete.fromDate, pendingDelete.toDate)}.`
            : ''
        }
        confirmLabel="Remove block"
        tone="primary"
      />
    </section>
  );
}
