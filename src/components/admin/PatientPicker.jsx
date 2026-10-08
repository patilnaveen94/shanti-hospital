import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  CalendarClock,
  IdCard,
  Loader2,
  Phone,
  Search,
  TriangleAlert,
  UserPlus,
} from 'lucide-react';

import { EmptyState } from '../common/Bits';
import {
  clearLookup,
  createPatient,
  lookupByPhone,
  selectLookup,
} from '../../store/recordsSlice';
import { pushToast } from '../../store/uiSlice';
import { formatShortDate } from '../../utils/format';

/**
 * Find or create a patient from a phone number.
 *
 * THE RULE THIS COMPONENT EXISTS TO ENFORCE: a phone number produces
 * candidates, never an identity. Staff always confirm, including when there is
 * exactly one match — because one match on a shared family number is how a
 * mother's three children end up sharing one medical history, and how staff
 * then read the wrong child's allergies.
 *
 * The confirmation is one tap. The alternative is a clinical safety bug that
 * nobody notices until it matters.
 */
export default function PatientPicker({ onPicked }) {
  const dispatch = useDispatch();
  const lookup = useSelector(selectLookup);

  const [phone, setPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ fullName: '', ageYears: '', gender: 'Female', dateOfBirth: '' });
  const [errors, setErrors] = useState({});

  const digits = phone.replace(/\D/g, '');
  const searched = lookup.status === 'done' && lookup.phone === digits && digits.length === 10;

  const search = (event) => {
    event?.preventDefault();
    if (digits.length !== 10) {
      setErrors({ phone: 'Enter a 10-digit mobile number.' });
      return;
    }
    setErrors({});
    setCreating(false);
    dispatch(lookupByPhone(digits));
  };

  const reset = () => {
    setPhone('');
    setCreating(false);
    setDraft({ fullName: '', ageYears: '', gender: 'Female', dateOfBirth: '' });
    dispatch(clearLookup());
  };

  const submitNew = async (event) => {
    event.preventDefault();
    const found = {};
    if (draft.fullName.trim().length < 2) found.fullName = "Enter the patient's name.";
    if (!draft.dateOfBirth && (draft.ageYears === '' || Number.isNaN(Number(draft.ageYears)))) {
      found.ageYears = 'Enter an age, or a date of birth.';
    }
    setErrors(found);
    if (Object.keys(found).length) return;

    const result = await dispatch(
      createPatient({ patient: draft, phone: digits, phoneLabel: 'self' })
    );
    if (result.meta.requestStatus === 'fulfilled') {
      dispatch(pushToast(`${result.payload.mrn} created for ${result.payload.fullName}`, 'success'));
      onPicked?.(result.payload);
      reset();
    }
  };

  return (
    <div>
      {/* Phone entry */}
      <form onSubmit={search} className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="Patient's 10-digit mobile number"
            aria-label="Patient mobile number"
            className={`input pl-10 ${errors.phone ? 'input-error' : ''}`}
          />
        </div>
        <button type="submit" className="btn-primary shrink-0">
          <Search className="h-4 w-4" aria-hidden="true" />
          Find patient
        </button>
      </form>

      {errors.phone && <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.phone}</p>}

      {lookup.status === 'loading' && (
        <p className="mt-4 flex items-center gap-2 text-[13.5px] text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Searching…
        </p>
      )}

      {/* Candidates */}
      {searched && !creating && (
        <div className="mt-4">
          {lookup.candidates.length > 0 ? (
            <>
              {/*
                The warning is shown for ANY number reaching more than one
                patient, because that is the case where picking wrong exposes
                someone else's clinical record.
              */}
              {lookup.candidates.length > 1 && (
                <p className="mb-3 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-[12.5px] leading-relaxed text-amber-900">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                  <span>
                    <strong className="font-bold">
                      {lookup.candidates.length} patients share this number.
                    </strong>{' '}
                    This is normal for a family phone. Pick carefully — the wrong choice attaches this
                    visit to someone else's medical record.
                  </span>
                </p>
              )}

              <p className="label">
                {lookup.candidates.length === 1 ? 'Is this the patient?' : 'Which patient?'}
              </p>

              <ul className="space-y-2">
                {lookup.candidates.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onPicked?.(c)}
                      className="tap flex w-full items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-3.5 text-left
                                 transition-all duration-200 ease-spring hover:border-primary-300 hover:bg-primary-50/40 active:scale-[.99]"
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-50 font-display text-[15px] font-bold text-primary-700">
                        {c.fullName.charAt(0).toUpperCase()}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-slate-900">{c.fullName}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-slate-500">
                          <span className="inline-flex items-center gap-1 font-mono font-semibold text-primary-700">
                            <IdCard className="h-3.5 w-3.5" aria-hidden="true" />
                            {c.mrn}
                          </span>
                          <span>
                            {c.age != null ? `${c.age} yrs` : 'age not recorded'} · {c.gender}
                          </span>
                          {c.phoneLabel && <span className="text-slate-400">({c.phoneLabel})</span>}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-3 text-[11.5px] text-slate-400">
                          {c.lastVisit && (
                            <span className="inline-flex items-center gap-1">
                              <CalendarClock className="h-3 w-3" aria-hidden="true" />
                              Last seen {formatShortDate(String(c.lastVisit).slice(0, 10))}
                            </span>
                          )}
                          <span>
                            {c.visitCount} {c.visitCount === 1 ? 'record' : 'records'}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => setCreating(true)}
                className="btn-secondary btn-sm mt-3 w-full"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                None of these — register a new patient
              </button>
            </>
          ) : (
            <EmptyState
              compact
              icon={UserPlus}
              title="No patient on this number"
              description="Register them once and every future visit links to the same record."
              action={
                <button type="button" onClick={() => setCreating(true)} className="btn-primary btn-sm">
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Register patient
                </button>
              }
            />
          )}
        </div>
      )}

      {/* New patient */}
      {creating && (
        <form onSubmit={submitNew} noValidate className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[13px] font-bold text-slate-800">
            New patient on {digits}
          </p>

          <div>
            <label className="label" htmlFor="pat-name">Full name *</label>
            <input
              id="pat-name"
              className={`input ${errors.fullName ? 'input-error' : ''}`}
              value={draft.fullName}
              onChange={(e) => setDraft((p) => ({ ...p, fullName: e.target.value }))}
              maxLength={120}
              placeholder="e.g. Laxmi Kamble"
            />
            {errors.fullName && <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.fullName}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="pat-dob">
                Date of birth <span className="font-normal text-slate-400">(preferred)</span>
              </label>
              <input
                id="pat-dob"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                className="input"
                value={draft.dateOfBirth}
                onChange={(e) => setDraft((p) => ({ ...p, dateOfBirth: e.target.value }))}
              />
              <p className="mt-1.5 text-[11.5px] leading-snug text-slate-500">
                A stored age is wrong within a year. Use this where the patient knows it.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="pat-age">Age in years</label>
              <input
                id="pat-age"
                type="number"
                min={0}
                max={120}
                className={`input ${errors.ageYears ? 'input-error' : ''}`}
                value={draft.ageYears}
                onChange={(e) => setDraft((p) => ({ ...p, ageYears: e.target.value }))}
                disabled={Boolean(draft.dateOfBirth)}
              />
              {errors.ageYears && <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.ageYears}</p>}
            </div>
          </div>

          <div>
            <span className="label">Gender *</span>
            <div className="flex flex-wrap gap-2">
              {['Female', 'Male', 'Other'].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setDraft((p) => ({ ...p, gender: g }))}
                  aria-pressed={draft.gender === g}
                  className={`chip ${draft.gender === g ? 'chip-active' : ''}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => setCreating(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Create record
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
