import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  CalendarOff,
  CalendarRange,
  CheckCheck,
  ChevronDown,
  Download,
  Loader2,
  MessageCircle,
  MessageCircleOff,
  Phone,
  Search,
  Trash2,
  TriangleAlert,
  UserPlus,
} from 'lucide-react';

import ConfirmDialog from '../common/ConfirmDialog';
import Modal from '../common/Modal';
import MessagePreview from './MessagePreview';
import WalkInForm from './WalkInForm';
import { EmptyState } from '../common/Bits';
import { APPOINTMENT_STATUSES } from '../../config/hospital';
import AppointmentRecordCell from './AppointmentRecordCell';
import { loadHistorySummary } from '../../store/recordsSlice';
import { selectSettings } from '../../store/settingsSlice';
import { selectUnavailability } from '../../store/unavailabilitySlice';
import { blockOn, formatRange } from '../../utils/schedule';
import { csvFilename, downloadCsv, toCsv } from '../../utils/csv';
import { toDateKey } from '../../utils/format';
import {
  MESSAGE_KINDS,
  bodyFor,
  kindEnabled,
  kindForStatus,
  templateParams,
  willNotifyOnStatus,
} from '../../utils/messageTemplates';
import {
  removeAppointment,
  selectAppointments,
  setAppointmentStatus,
  statusStyle,
} from '../../store/appointmentsSlice';
import { selectDoctors, to12h } from '../../store/doctorsSlice';
import { selectDepartments } from '../../store/departmentsSlice';
import {
  loadNotificationStatuses,
  notificationStyle,
  notifyPatient,
  selectNotifications,
} from '../../store/notificationsSlice';
import { pushToast } from '../../store/uiSlice';
import { formatShortDate, formatTimestamp, relativeTime, truncate } from '../../utils/format';

/**
 * Status selector.
 *
 * Moving an appointment to Confirmed or Cancelled also messages the patient.
 * The message is fired after the status write, never before, and a messaging
 * failure does not undo the status change — it surfaces as a badge with a retry
 * instead. Blocking a hospital workflow on a third-party API would be worse
 * than a missed message.
 */
function StatusSelect({ appointment }) {
  const dispatch = useDispatch();
  const settings = useSelector(selectSettings);
  const style = statusStyle(appointment.status);

  const onChange = async (event) => {
    const status = event.target.value;
    if (status === appointment.status) return;

    await dispatch(setAppointmentStatus({ id: appointment.id, status }));

    // Confirmed → confirmation, Cancelled → cancellation, Completed → thank you.
    // Pending sends nothing; the patient already saw the on-screen reference.
    const kind = kindForStatus(status);

    if (!kind) {
      dispatch(pushToast(`${appointment.refId} marked ${status}`, 'success'));
      return;
    }

    // Say so when the message is switched off. Staff would otherwise assume the
    // patient had been told, which is the exact failure this whole feature is
    // meant to prevent.
    if (!willNotifyOnStatus(status, settings)) {
      dispatch(
        pushToast(
          `${appointment.refId} marked ${status} — no message sent, it is switched off in Settings`,
          'info'
        )
      );
      return;
    }

    dispatch(pushToast(`${appointment.refId} marked ${status}`, 'success'));
    dispatch(notifyPatient({ appointmentId: appointment.id, kind }));
  };

  return (
    <div className="relative inline-block">
      <select
        value={appointment.status}
        onChange={onChange}
        aria-label={`Status for ${appointment.refId}`}
        className={`tap min-h-[36px] cursor-pointer appearance-none rounded-full border-0 py-1 pl-3 pr-7 text-[11.5px] font-bold uppercase tracking-wide focus:ring-2 focus:ring-primary-400 ${style.badge}`}
      >
        {APPOINTMENT_STATUSES.map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-60" aria-hidden="true" />
    </div>
  );
}

/** WhatsApp delivery badge with resend and preview controls. */
function NotifyCell({ appointment, onPreview }) {
  const dispatch = useDispatch();
  const record = useSelector(selectNotifications)[appointment.id];
  const sending = record?.sending;

  // `force` because a human pressed the button — the automatic-send toggles
  // should not veto an explicit request.
  const resend = () =>
    dispatch(
      notifyPatient({
        appointmentId: appointment.id,
        // A Pending appointment has no status-driven message, so a manual send
        // uses the confirmation — that is what someone pressing "Send" wants.
        kind: kindForStatus(appointment.status) || 'confirmed',
        force: true,
      })
    );

  if (sending) {
    return (
      <span className="badge bg-amber-100 text-amber-800">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        Sending
      </span>
    );
  }

  const preview = (
    <button
      type="button"
      onClick={() => onPreview(appointment)}
      className="tap inline-flex items-center justify-center rounded-lg px-2 text-[11px] font-bold text-slate-500
                 underline-offset-2 hover:bg-slate-100 hover:text-primary-700 hover:underline"
      title="See exactly what this patient receives"
    >
      Preview
    </button>
  );

  if (!record) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={resend}
          className="tap inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-200"
          title="Send a WhatsApp message to the patient"
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Send
        </button>
        {preview}
      </span>
    );
  }

  const style = notificationStyle(record.status);

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={`badge ${style.badge}`} title={record.error || undefined}>
        {record.status === 'sent' ? (
          <CheckCheck className="h-3 w-3" aria-hidden="true" />
        ) : (
          <MessageCircleOff className="h-3 w-3" aria-hidden="true" />
        )}
        {style.label}
      </span>
      {record.at && <span className="text-[10.5px] text-slate-400">{relativeTime(record.at)}</span>}
      {record.status !== 'sent' && (
        <button
          type="button"
          onClick={resend}
          className="text-[11px] font-bold text-primary-700 underline-offset-2 hover:underline"
        >
          Retry
        </button>
      )}
      {preview}
    </span>
  );
}

/**
 * "Doctor on leave" flag for a booking whose date was blocked after it was made.
 * Shows the reason when staff recorded one, because "Conference" and "Sick" lead
 * to different conversations with the patient.
 */
function ClashFlag({ block, compact = false }) {
  if (!block) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2 py-1 font-bold text-amber-900 ${
        compact ? 'text-[10.5px]' : 'text-[11px]'
      }`}
      title={`Doctor unavailable ${formatRange(block.fromDate, block.toDate)}${
        block.reason ? ` — ${block.reason}` : ''
      }. Contact the patient.`}
    >
      <CalendarOff className="h-3 w-3 shrink-0" aria-hidden="true" />
      Doctor on leave{block.reason ? ` · ${block.reason}` : ''}
    </span>
  );
}

export default function AppointmentTracker() {
  const dispatch = useDispatch();
  const appointments = useSelector(selectAppointments);
  const doctors = useSelector(selectDoctors);
  const departments = useSelector(selectDepartments);
  const settings = useSelector(selectSettings);
  const unavailability = useSelector(selectUnavailability);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [walkIn, setWalkIn] = useState(false);
  const [previewFor, setPreviewFor] = useState(null);
  const [previewKind, setPreviewKind] = useState('confirmed');
  const [onlyClashes, setOnlyClashes] = useState(false);

  const openPreview = (appointment) => {
    setPreviewKind(kindForStatus(appointment.status) || 'confirmed');
    setPreviewFor(appointment);
  };

  // Pull the latest delivery result per appointment when the tracker opens.
  useEffect(() => {
    dispatch(loadNotificationStatuses());
  }, [dispatch]);

  /*
   * Past-record counts for every phone number in the list, in ONE request.
   * This is what makes "has this patient been here before?" visible without
   * leaving the appointment list — asking per row would be twenty round trips
   * to paint one screen.
   */
  const visiblePhones = useMemo(
    () => [...new Set(appointments.map((a) => a.patient?.phone).filter(Boolean))].sort().join(','),
    [appointments]
  );

  useEffect(() => {
    if (visiblePhones) dispatch(loadHistorySummary(visiblePhones.split(',')));
  }, [dispatch, visiblePhones]);

  const doctorName = (id) => doctors.find((d) => d.id === id)?.name || 'Unassigned';
  const deptName = (id) => departments.find((d) => d.id === id)?.name || '—';

  /**
   * Appointments sitting on a date the doctor is now blocked for.
   *
   * Leave can be added after a patient has already booked. Blocking the date
   * stops *new* bookings but says nothing about the ones already in the diary,
   * so without this the appointment simply stays Confirmed and the patient
   * travels to see a consultant who is not there. `{ [appointmentId]: block }`.
   */
  const clashes = useMemo(() => {
    const found = {};
    appointments.forEach((apt) => {
      // Cancelled and Completed need no action — the visit is already resolved.
      if (!['Pending', 'Confirmed'].includes(apt.status)) return;
      const block = blockOn(unavailability, apt.doctorId, apt.date);
      if (block) found[apt.id] = block;
    });
    return found;
  }, [appointments, unavailability]);

  const clashCount = Object.keys(clashes).length;

  /*
   * Once the last clash is resolved the banner disappears — and with it the only
   * control that can switch this filter off. Clear it here or the tracker is
   * stuck showing an empty list with no visible reason why.
   */
  useEffect(() => {
    if (!clashCount && onlyClashes) setOnlyClashes(false);
  }, [clashCount, onlyClashes]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return appointments
      .filter((apt) => {
        if (onlyClashes && !clashes[apt.id]) return false;
        if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
        if (doctorFilter !== 'all' && apt.doctorId !== doctorFilter) return false;
        if (!needle) return true;
        return [apt.refId, apt.patient.name, apt.patient.phone, doctorName(apt.doctorId)]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      })
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [appointments, query, statusFilter, doctorFilter, doctors, onlyClashes, clashes]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(
    () =>
      APPOINTMENT_STATUSES.reduce(
        (acc, status) => ({ ...acc, [status]: appointments.filter((a) => a.status === status).length }),
        {}
      ),
    [appointments]
  );

  /**
   * Download an appointment sheet.
   *
   * Built from the currently filtered rows, so what you see is what you get.
   * A per-doctor sheet is the common case — the front desk prints one per
   * consultant for the day — so the doctor filter drives the filename too.
   */
  const exportSheet = () => {
    if (!rows.length) {
      dispatch(pushToast('Nothing to export with these filters.', 'info'));
      return;
    }

    const columns = [
      { label: 'Reference', format: (a) => a.refId },
      { label: 'Date', format: (a) => a.date },
      { label: 'Time', format: (a) => to12h(a.slot) },
      { label: 'Patient', format: (a) => a.patient.name },
      { label: 'Age', format: (a) => a.patient.age },
      { label: 'Gender', format: (a) => a.patient.gender },
      { label: 'Phone', format: (a) => a.patient.phone },
      { label: 'Doctor', format: (a) => doctorName(a.doctorId) },
      { label: 'Department', format: (a) => deptName(a.departmentId) },
      { label: 'Status', format: (a) => a.status },
      // Carried into the sheet so a printed list flags the same problem the
      // screen does — the front desk works from the print-out, not the browser.
      {
        label: 'Doctor unavailable',
        format: (a) => {
          const block = clashes[a.id];
          if (!block) return '';
          return block.reason
            ? `YES — ${formatRange(block.fromDate, block.toDate)} (${block.reason})`
            : `YES — ${formatRange(block.fromDate, block.toDate)}`;
        },
      },
      { label: 'Source', format: (a) => (a.source === 'walkin' ? 'Walk-in' : 'Online') },
      { label: 'Reason for visit', format: (a) => a.patient.symptoms },
      { label: 'Booked at', format: (a) => formatTimestamp(a.createdAt) },
    ];

    // Sheets are read chronologically, unlike the on-screen newest-first list.
    const ordered = rows
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot));

    const who = doctorFilter === 'all' ? 'all-doctors' : doctorName(doctorFilter);
    const name = csvFilename(['shanti', 'appointments', who, toDateKey(new Date())]);

    downloadCsv(name, toCsv(columns, ordered));
    dispatch(pushToast(`Downloaded ${ordered.length} appointments`, 'success'));
  };

  return (
    <section>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl">Appointment tracker</h2>
          <p className="mt-0.5 text-[13.5px] text-slate-500">
            {appointments.length} total · {counts.Pending || 0} awaiting confirmation ·{' '}
            {appointments.filter((a) => a.source === 'walkin').length} walk-ins
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setWalkIn(true)} className="btn-primary btn-sm">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Add walk-in
          </button>
          <button type="button" onClick={exportSheet} className="btn-secondary btn-sm">
            <Download className="h-4 w-4" aria-hidden="true" />
            Download sheet
          </button>
        </div>
      </header>

      {/*
        Leave added after the fact does not move existing bookings, so say so
        loudly. These patients need a phone call, not a quietly greyed-out date.
      */}
      {clashCount > 0 && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2.5 text-[13px] leading-relaxed text-amber-900">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
            <span>
              <strong className="font-bold">
                {clashCount} {clashCount === 1 ? 'appointment falls' : 'appointments fall'} on a date the doctor is
                now unavailable.
              </strong>{' '}
              Blocking a date stops new bookings but does not move existing ones — these patients still expect to be
              seen. Call them to reschedule or cancel.
            </span>
          </p>
          <button
            type="button"
            onClick={() => setOnlyClashes((prev) => !prev)}
            aria-pressed={onlyClashes}
            className={`btn-sm shrink-0 ${onlyClashes ? 'btn-primary' : 'btn-secondary'}`}
          >
            <CalendarOff className="h-3.5 w-3.5" aria-hidden="true" />
            {onlyClashes ? 'Show all appointments' : 'Show only these'}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-3 flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by reference, patient, phone or doctor…" aria-label="Search appointments" className="input pl-10" />
        </div>
        {/* Doctor filter drives the downloaded sheet as well as the list. */}
        <select
          value={doctorFilter}
          onChange={(e) => setDoctorFilter(e.target.value)}
          aria-label="Filter by doctor"
          className="select sm:w-64"
        >
          <option value="all">All doctors</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="-mx-4 mb-4 px-4 sm:mx-0 sm:px-0">
        <div className="snap-rail pb-1">
          <button type="button" onClick={() => setStatusFilter('all')} aria-pressed={statusFilter === 'all'} className={`chip snap-start ${statusFilter === 'all' ? 'chip-active' : ''}`}>
            All
            <span className={`rounded-full px-1.5 text-[11px] ${statusFilter === 'all' ? 'bg-white/20' : 'bg-slate-100'}`}>{appointments.length}</span>
          </button>
          {APPOINTMENT_STATUSES.map((status) => {
            const on = statusFilter === status;
            return (
              <button key={status} type="button" onClick={() => setStatusFilter(status)} aria-pressed={on} className={`chip snap-start ${on ? 'chip-active' : ''}`}>
                {status}
                <span className={`rounded-full px-1.5 text-[11px] ${on ? 'bg-white/20' : 'bg-slate-100'}`}>{counts[status] || 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!rows.length ? (
        <EmptyState
          icon={onlyClashes ? CalendarOff : CalendarRange}
          title={
            onlyClashes
              ? 'Nothing clashes with the current filters'
              : appointments.length
                ? 'No appointments match'
                : 'No appointments booked yet'
          }
          description={
            onlyClashes
              ? 'There are clashing appointments, but none match your search, status or doctor filter. Clear those to see them.'
              : appointments.length
                ? 'Try a different search term or status filter.'
                : 'Bookings made from the patient portal will land here in real time.'
          }
        />
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="space-y-3 lg:hidden">
            {rows.map((apt) => (
              <li
                key={apt.id}
                className={`card p-4 ${clashes[apt.id] ? 'border-amber-300 bg-amber-50/40' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[13px] font-bold text-primary-700">{apt.refId}</p>
                    <p className="mt-0.5 truncate font-semibold text-slate-900">{apt.patient.name}</p>
                    <p className="text-[12px] text-slate-500">
                      {apt.patient.age} yrs · {apt.patient.gender}
                    </p>
                  </div>
                  <StatusSelect appointment={apt} />
                </div>

                <dl className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-3 text-[12.5px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Doctor</dt>
                    <dd className="text-right font-semibold text-slate-800">{doctorName(apt.doctorId)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Department</dt>
                    <dd className="text-right text-slate-700">{deptName(apt.departmentId)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Slot</dt>
                    <dd className="text-right font-semibold text-slate-800">
                      {formatShortDate(apt.date)} · {to12h(apt.slot)}
                    </dd>
                  </div>
                </dl>

                {clashes[apt.id] && (
                  <p className="mt-2.5">
                    <ClashFlag block={clashes[apt.id]} />
                  </p>
                )}

                {Boolean(apt.patient.symptoms) && (
                  <p className="mt-2.5 text-[12.5px] leading-relaxed text-slate-600">
                    <span className="font-semibold text-slate-700">Symptoms: </span>
                    {apt.patient.symptoms}
                  </p>
                )}

                <div className="mt-3 border-t border-slate-100 pt-3">
                  <AppointmentRecordCell appointment={apt} compact />
                </div>

                <div className="mt-3 border-t border-slate-100 pt-3">
                  <NotifyCell appointment={apt} onPreview={openPreview} />
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <a href={`tel:${apt.patient.phone}`} className="btn-secondary btn-sm">
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                    {apt.patient.phone}
                  </a>
                  <button type="button" onClick={() => setPendingDelete(apt)} aria-label={`Delete ${apt.refId}`} className="tap grid h-11 w-11 place-items-center rounded-lg border border-danger-200 text-danger-600 transition-colors hover:bg-danger-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="card hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11.5px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-bold">Reference</th>
                    <th scope="col" className="px-4 py-3 font-bold">Patient</th>
                    <th scope="col" className="px-4 py-3 font-bold">Doctor / Dept</th>
                    <th scope="col" className="px-4 py-3 font-bold">Slot</th>
                    <th scope="col" className="px-4 py-3 font-bold">Symptoms</th>
                    <th scope="col" className="px-4 py-3 font-bold">Status</th>
                    <th scope="col" className="px-4 py-3 font-bold">Records</th>
                    <th scope="col" className="px-4 py-3 font-bold">WhatsApp</th>
                    <th scope="col" className="px-4 py-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((apt) => (
                    <tr
                      key={apt.id}
                      className={`transition-colors ${
                        clashes[apt.id] ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-mono text-[12.5px] font-bold text-primary-700">{apt.refId}</p>
                        <p className="text-[11.5px] text-slate-400">{formatTimestamp(apt.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{apt.patient.name}</p>
                        <p className="text-[12px] text-slate-500">
                          {apt.patient.age} yrs · {apt.patient.gender}
                        </p>
                        <a href={`tel:${apt.patient.phone}`} className="text-[12px] font-semibold text-primary-700 hover:underline">
                          {apt.patient.phone}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-800">{doctorName(apt.doctorId)}</p>
                        <p className="text-[12px] text-slate-500">{deptName(apt.departmentId)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{formatShortDate(apt.date)}</p>
                        <p className="text-[12px] text-slate-500">{to12h(apt.slot)}</p>
                        {clashes[apt.id] && (
                          <p className="mt-1.5">
                            <ClashFlag block={clashes[apt.id]} compact />
                          </p>
                        )}
                      </td>
                      <td className="max-w-[16rem] px-4 py-3 text-[12.5px] text-slate-600">
                        {apt.patient.symptoms ? truncate(apt.patient.symptoms, 90) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3"><StatusSelect appointment={apt} /></td>
                      <td className="px-4 py-3"><AppointmentRecordCell appointment={apt} /></td>
                      <td className="px-4 py-3"><NotifyCell appointment={apt} onPreview={openPreview} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button type="button" onClick={() => setPendingDelete(apt)} aria-label={`Delete ${apt.refId}`} className="grid h-9 w-9 place-items-center rounded-lg border border-danger-200 text-danger-600 transition-colors hover:bg-danger-50">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {walkIn && <WalkInForm open onClose={() => setWalkIn(false)} />}

      {/* Per-appointment preview: the real message for this real patient. */}
      <Modal
        open={Boolean(previewFor)}
        onClose={() => setPreviewFor(null)}
        title="Message preview"
        subtitle={previewFor ? `${previewFor.patient.name} · ${previewFor.patient.phone}` : ''}
      >
        {previewFor && (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              {MESSAGE_KINDS.map((kind) => {
                const on = previewKind === kind.id;
                return (
                  <button
                    key={kind.id}
                    type="button"
                    onClick={() => setPreviewKind(kind.id)}
                    aria-pressed={on}
                    className={`chip ${on ? 'chip-active' : ''}`}
                  >
                    {kind.label}
                  </button>
                );
              })}
            </div>

            <MessagePreview
              body={bodyFor(previewKind, settings)}
              params={templateParams(
                previewFor,
                doctorName(previewFor.doctorId),
                deptName(previewFor.departmentId)
              )}
              disabled={!kindEnabled(previewKind, settings)}
              note="Wording is governed by the Meta-approved template. Change it under Settings → WhatsApp messages."
            />

            <button
              type="button"
              onClick={() => {
                dispatch(
                  notifyPatient({ appointmentId: previewFor.id, kind: previewKind, force: true })
                );
                setPreviewFor(null);
              }}
              className="btn-primary mt-4 w-full"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Send this message now
            </button>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          dispatch(removeAppointment(pendingDelete.id));
          dispatch(pushToast(`${pendingDelete.refId} deleted`, 'info'));
        }}
        title={`Delete ${pendingDelete?.refId}?`}
        message={`This permanently removes ${pendingDelete?.patient?.name}'s booking record. Consider marking it Cancelled instead to keep the history.`}
        confirmLabel="Delete booking"
      />
    </section>
  );
}
