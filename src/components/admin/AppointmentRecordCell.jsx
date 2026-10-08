import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  FilePlus2,
  FolderOpen,
  Link2,
  Loader2,
  TriangleAlert,
  UserPlus,
} from 'lucide-react';

import Modal from '../common/Modal';
import PrescriptionForm from './PrescriptionForm';
import PrescriptionHistory from './PrescriptionHistory';
import { linkAppointment, selectRowRecord } from '../../store/recordsSlice';
import { pushToast } from '../../store/uiSlice';
import { formatShortDate } from '../../utils/format';

/**
 * The records control on an appointment row.
 *
 * This is where prescriptions are actually added, because it is where staff
 * already are: today's list, with the patient's name, phone and age in front of
 * them. Making them retype the number on a separate screen to reach the same
 * record is friction that gets skipped, and a skipped record is no record.
 *
 * Three states:
 *   unlinked   → "Link record", because identity needs a human
 *   ambiguous  → a chooser, because the number reaches several patients
 *   linked     → past-visit count, "History", and "Add prescription"
 */
export default function AppointmentRecordCell({ appointment, compact = false }) {
  const dispatch = useDispatch();
  const row = useSelector(selectRowRecord(appointment));

  const [choosing, setChoosing] = useState(false);
  const [history, setHistory] = useState(false);
  const [adding, setAdding] = useState(false);
  const [linking, setLinking] = useState(false);

  const phone = appointment.patient?.phone || '';

  const link = async (patientId) => {
    setLinking(true);
    const result = await dispatch(linkAppointment({ appointment, patientId }));
    setLinking(false);
    setChoosing(false);

    if (result.meta.requestStatus === 'fulfilled') {
      const p = result.payload.patient;
      dispatch(pushToast(`Linked to ${p?.fullName || 'patient'} (${p?.mrn || 'new record'})`, 'success'));
    }
  };

  /* ---------------- already linked ---------------- */
  if (row.linkedId) {
    const name = row.patient?.fullName || appointment.patient.name;
    return (
      <>
        <div className={compact ? 'flex flex-wrap items-center gap-1.5' : 'flex flex-wrap items-center gap-1.5'}>
          {row.pastVisits > 0 ? (
            <button
              type="button"
              onClick={() => setHistory(true)}
              className="tap inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-bold text-primary-700 transition-colors hover:bg-primary-100"
              title={`${name} has ${row.pastVisits} previous record${row.pastVisits === 1 ? '' : 's'}`}
            >
              <FolderOpen className="h-3 w-3" aria-hidden="true" />
              {row.pastVisits} past record{row.pastVisits === 1 ? '' : 's'}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
              First visit
            </span>
          )}

          <button
            type="button"
            onClick={() => setAdding(true)}
            className="tap inline-flex items-center gap-1.5 rounded-full bg-mint-600 px-2.5 py-1 text-[11px] font-bold text-white transition-colors hover:bg-mint-700"
          >
            <FilePlus2 className="h-3 w-3" aria-hidden="true" />
            Prescription
          </button>
        </div>

        {history && (
          <Modal
            open
            onClose={() => setHistory(false)}
            title={name}
            subtitle={row.patient?.mrn ? `${row.patient.mrn} · previous visits` : 'Previous visits'}
            size="lg"
          >
            <PrescriptionHistory patient={row.patient || { id: row.linkedId, fullName: name }} />
          </Modal>
        )}

        {adding && (
          <PrescriptionForm
            open
            onClose={() => setAdding(false)}
            patient={row.patient || { id: row.linkedId, fullName: name, mrn: row.patient?.mrn || '' }}
            appointmentId={appointment.id}
          />
        )}
      </>
    );
  }

  /* ---------------- needs linking ---------------- */
  return (
    <>
      <button
        type="button"
        onClick={() => (row.candidates.length ? setChoosing(true) : link(null))}
        disabled={linking}
        className={`tap inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
          row.ambiguous
            ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
        title={
          row.ambiguous
            ? 'Several patients use this number — choose which one'
            : 'Attach this visit to a patient record'
        }
      >
        {linking ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        ) : row.ambiguous ? (
          <TriangleAlert className="h-3 w-3" aria-hidden="true" />
        ) : (
          <Link2 className="h-3 w-3" aria-hidden="true" />
        )}
        {row.ambiguous ? `${row.candidates.length} patients — choose` : 'Link record'}
      </button>

      {choosing && (
        <Modal
          open
          onClose={() => setChoosing(false)}
          title="Which patient is this?"
          subtitle={`${appointment.patient.name} · ${phone}`}
          size="md"
        >
          <p className="mb-3 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-[12.5px] leading-relaxed text-amber-900">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
            <span>
              This number already reaches{' '}
              <strong className="font-bold">
                {row.candidates.length} patient{row.candidates.length === 1 ? '' : 's'}
              </strong>
              , which is normal for a family phone. Choosing wrong attaches this visit to someone
              else's medical record.
            </span>
          </p>

          <ul className="space-y-2">
            {row.candidates.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => link(c.id)}
                  disabled={linking}
                  className="tap flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:border-primary-300 hover:bg-primary-50/40"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 font-display text-[14px] font-bold text-primary-700">
                    {c.fullName.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-900">{c.fullName}</span>
                    <span className="mt-0.5 block text-[12px] text-slate-500">
                      <span className="font-mono font-semibold text-primary-700">{c.mrn}</span>
                      {' · '}
                      {c.age != null ? `${c.age} yrs` : 'age not recorded'} · {c.gender}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] text-slate-400">
                      {c.visitCount} record{c.visitCount === 1 ? '' : 's'}
                      {c.lastVisit ? ` · last ${formatShortDate(String(c.lastVisit).slice(0, 10))}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/*
            Always offered. The booking name may match nobody on the number —
            a neighbour's phone, a new child in the family — and forcing a
            choice between wrong options is how records get merged.
          */}
          <button
            type="button"
            onClick={() => link(null)}
            disabled={linking}
            className="btn-secondary btn-sm mt-3 w-full"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            None of these — new record for {appointment.patient.name}
          </button>
        </Modal>
      )}
    </>
  );
}
