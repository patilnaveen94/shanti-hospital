import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft,
  FilePlus2,
  HardDrive,
  IdCard,
  Phone,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import PatientPicker from './PatientPicker';
import PrescriptionForm from './PrescriptionForm';
import PrescriptionHistory from './PrescriptionHistory';
import { isCloudMode } from '../../api/client';
import { findPatients, loadPatient, selectAllPatients, selectPatientsById } from '../../store/recordsSlice';

/**
 * Patient records tab.
 *
 * Two states rather than a split view: find a patient, then work on that
 * patient. On a phone a master/detail layout would give each half too little
 * room, and staff only ever work with one patient at a time.
 */
export default function PatientRecords() {
  const dispatch = useDispatch();
  const patientsById = useSelector(selectPatientsById);

  const allPatients = useSelector(selectAllPatients);

  const [activeId, setActiveId] = useState('');
  const [recording, setRecording] = useState(false);
  const [term, setTerm] = useState('');

  const active = activeId ? patientsById[activeId] : null;

  const needle = term.trim().toLowerCase();
  const results = needle.length >= 2
    ? allPatients.filter(
        (p) =>
          p.fullName.toLowerCase().includes(needle) ||
          (p.mrn || '').toLowerCase().includes(needle) ||
          (p.phones || []).some((x) => x.phone.startsWith(needle))
      )
    : [];

  const pick = (candidate) => {
    setActiveId(candidate.id);
    // A candidate row carries only what the chooser needed; fetch the rest.
    dispatch(loadPatient(candidate.id));
  };

  /* ---------------- patient selected ---------------- */
  if (activeId) {
    const name = active?.fullName || 'Patient';
    const mrn = active?.mrn || '';
    const age = active?.age ?? active?.ageYears;

    return (
      <section>
        <button
          type="button"
          onClick={() => setActiveId('')}
          className="btn-ghost btn-sm -ml-2 mb-3"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Find another patient
        </button>

        {/* Patient header */}
        <div className="card mb-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-50 font-display text-lg font-bold text-primary-700">
                {name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-slate-900">{name}</h2>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-slate-500">
                  {mrn && (
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-primary-700">
                      <IdCard className="h-3.5 w-3.5" aria-hidden="true" />
                      {mrn}
                    </span>
                  )}
                  <span>
                    {age != null ? `${age} yrs` : 'age not recorded'}
                    {active?.gender ? ` · ${active.gender}` : ''}
                  </span>
                </p>
                {Boolean(active?.phones?.length) && (
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
                    <Phone className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    {active.phones.map((p) => (
                      <span key={p.phone}>
                        {p.phone}
                        {p.label ? ` (${p.label})` : ''}
                      </span>
                    ))}
                  </p>
                )}
              </div>
            </div>

            <button type="button" onClick={() => setRecording(true)} className="btn-primary btn-sm shrink-0">
              <FilePlus2 className="h-4 w-4" aria-hidden="true" />
              Add prescription
            </button>
          </div>

          {/* Allergies and chronic conditions belong in front of the clinician,
              not behind an edit screen. */}
          {Boolean(active?.notes) && (
            <p className="mt-3.5 rounded-xl border-l-4 border-amber-400 bg-amber-50 p-3 text-[12.5px] leading-relaxed text-amber-900">
              <strong className="font-bold">Note: </strong>
              {active.notes}
            </p>
          )}
        </div>

        <h3 className="mb-2 text-[15px] font-bold text-slate-900">Prescription history</h3>
        <PrescriptionHistory patient={active || { id: activeId }} />

        {recording && active && (
          <PrescriptionForm open onClose={() => setRecording(false)} patient={active} />
        )}
      </section>
    );
  }

  /* ---------------- finding a patient ---------------- */
  return (
    <section>
      <header className="mb-4">
        <h2 className="text-xl">Patient records</h2>
        <p className="mt-0.5 text-[13.5px] text-slate-500">
          Find a patient by mobile number to view their prescription history or record a new one.
        </p>
      </header>

      {!isCloudMode && (
        <p className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[12.5px] leading-relaxed text-amber-900">
          <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <span>
            No database is connected, so records live in this browser only and prescription images
            are kept as small previews rather than stored. Clinical records should never run on the
            demo setup — see <code className="font-mono font-bold">README-backend.md</code>.
          </span>
        </p>
      )}

      <div className="card p-4 sm:p-5">
        <PatientPicker onPicked={pick} />

        {/* Name or MRN, for when the number is not to hand. */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <label className="label" htmlFor="pat-search">
            Or search by name or hospital number
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              id="pat-search"
              type="search"
              value={term}
              onChange={(e) => {
                setTerm(e.target.value);
                if (e.target.value.trim().length >= 2) dispatch(findPatients(e.target.value));
              }}
              placeholder="e.g. Kamble, or SH-2026-00001"
              className="input pl-10"
            />
          </div>

          {term.trim().length >= 2 && (
            <ul className="mt-2.5 space-y-2">
              {results.length ? (
                results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => pick(p)}
                      className="tap flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-primary-300 hover:bg-primary-50/40"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold text-slate-900">{p.fullName}</span>
                        <span className="mt-0.5 block text-[11.5px] text-slate-500">
                          <span className="font-mono font-semibold text-primary-700">{p.mrn}</span>
                          {p.phones?.[0] ? ` · ${p.phones[0].phone}` : ''}
                          {p.visitCount != null ? ` · ${p.visitCount} record${p.visitCount === 1 ? '' : 's'}` : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-1 py-2 text-[12.5px] text-slate-500">No patient matches that.</li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Why the phone number is not the identity — stated where staff will
          meet the behaviour, not buried in a document. */}
      <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-slate-50 p-3.5 text-[12px] leading-relaxed text-slate-600">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <span>
          A mobile number can reach several patients — families share phones, and numbers get
          reassigned. Each patient therefore has their own record and hospital number, and the
          number only finds candidates. Always confirm the name and age before attaching a
          prescription.
        </span>
      </div>

      {/* Recently touched patients, as a shortcut back. */}
      {Object.keys(patientsById).length > 0 && (
        <div className="mt-5">
          <p className="label">Recently opened</p>
          <ul className="flex flex-wrap gap-2">
            {Object.values(patientsById)
              .slice(-8)
              .reverse()
              .map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => pick(p)}
                    className="chip"
                  >
                    <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                    {p.fullName}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
    </section>
  );
}
