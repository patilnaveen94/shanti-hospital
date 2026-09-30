import { useState } from 'react';
import { useSelector } from 'react-redux';
import { CalendarCheck, IndianRupee, Loader2, ShieldCheck } from 'lucide-react';

import { to12h } from '../../store/doctorsSlice';
import { selectSettings } from '../../store/settingsSlice';
import { isFeeVisible } from '../../utils/fees';
import { formatLongDate } from '../../utils/format';

const GENDERS = ['Male', 'Female', 'Other'];

const EMPTY = { name: '', phone: '', age: '', gender: '', symptoms: '' };

/** Client-side validation. Returns `{ field: message }`. */
function validate(values) {
  const errors = {};

  if (!values.name.trim()) errors.name = 'Please enter the patient name.';
  else if (values.name.trim().length < 3) errors.name = 'Name looks too short.';

  const digits = values.phone.replace(/\D/g, '');
  if (!digits) errors.phone = 'A contact number is required.';
  else if (digits.length !== 10) errors.phone = 'Enter a 10-digit mobile number.';

  const age = Number(values.age);
  if (!values.age) errors.age = 'Age is required.';
  else if (!Number.isFinite(age) || age < 0 || age > 120) errors.age = 'Enter an age between 0 and 120.';

  if (!values.gender) errors.gender = 'Please select a gender.';

  return errors;
}

/** Step 4 — patient details form plus a booking summary. */
export default function StepDetails({ doctor, department, booking, submitting, onSubmit }) {
  const settings = useSelector(selectSettings);
  const showFees = isFeeVisible(doctor, settings);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const setField = (field) => (event) => {
    const { value } = event.target;
    setValues((prev) => ({ ...prev, [field]: value }));
    // Re-validate a field the moment the user has already been warned about it.
    if (touched[field]) {
      setErrors(validate({ ...values, [field]: value }));
    }
  };

  const blur = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validate(values));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    setTouched({ name: true, phone: true, age: true, gender: true });

    if (Object.keys(found).length) {
      // Move focus to the first problem so mobile users aren't left guessing.
      const first = document.getElementById(`patient-${Object.keys(found)[0]}`);
      first?.focus();
      first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    onSubmit(values);
  };

  const showError = (field) => touched[field] && errors[field];

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Booking summary */}
      <div className="mb-5 rounded-2xl border border-primary-100 bg-primary-50/60 p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-700">
          <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Your selection
        </p>
        <dl className="mt-2.5 space-y-1.5 text-[13.5px]">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Doctor</dt>
            <dd className="text-right font-semibold text-slate-900">{doctor?.name}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Department</dt>
            <dd className="text-right font-semibold text-slate-900">{department?.name}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">When</dt>
            <dd className="text-right font-semibold text-slate-900">
              {formatLongDate(booking.date)} · {to12h(booking.slot)}
            </dd>
          </div>
          {showFees && (
            <div className="flex justify-between gap-3 border-t border-primary-200/70 pt-1.5">
              <dt className="text-slate-500">Consultation fee</dt>
              <dd className="inline-flex items-center text-right font-bold text-mint-700">
                <IndianRupee className="h-3.5 w-3.5" aria-hidden="true" />
                {doctor?.fee}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="patient-name">
            Patient name <span className="text-danger-600">*</span>
          </label>
          <input
            id="patient-name"
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={setField('name')}
            onBlur={blur('name')}
            aria-invalid={Boolean(showError('name'))}
            aria-describedby={showError('name') ? 'err-name' : undefined}
            className={`input ${showError('name') ? 'input-error' : ''}`}
            placeholder="Full name as per records"
          />
          {showError('name') && (
            <p id="err-name" className="mt-1.5 text-[12.5px] font-medium text-danger-600">
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="patient-phone">
            Mobile number <span className="text-danger-600">*</span>
          </label>
          <div className="flex gap-2">
            <span className="grid min-h-[46px] shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-[15px] font-semibold text-slate-500">
              +91
            </span>
            <input
              id="patient-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              value={values.phone}
              onChange={setField('phone')}
              onBlur={blur('phone')}
              aria-invalid={Boolean(showError('phone'))}
              aria-describedby={showError('phone') ? 'err-phone' : undefined}
              className={`input ${showError('phone') ? 'input-error' : ''}`}
              placeholder="10-digit mobile"
            />
          </div>
          {showError('phone') ? (
            <p id="err-phone" className="mt-1.5 text-[12.5px] font-medium text-danger-600">
              {errors.phone}
            </p>
          ) : (
            <p className="mt-1.5 text-[12px] text-slate-500">We'll send the appointment confirmation here.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="patient-age">
              Age <span className="text-danger-600">*</span>
            </label>
            <input
              id="patient-age"
              type="number"
              inputMode="numeric"
              min="0"
              max="120"
              value={values.age}
              onChange={setField('age')}
              onBlur={blur('age')}
              aria-invalid={Boolean(showError('age'))}
              aria-describedby={showError('age') ? 'err-age' : undefined}
              className={`input ${showError('age') ? 'input-error' : ''}`}
              placeholder="Years"
            />
            {showError('age') && (
              <p id="err-age" className="mt-1.5 text-[12.5px] font-medium text-danger-600">
                {errors.age}
              </p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="patient-gender">
              Gender <span className="text-danger-600">*</span>
            </label>
            <select
              id="patient-gender"
              value={values.gender}
              onChange={setField('gender')}
              onBlur={blur('gender')}
              aria-invalid={Boolean(showError('gender'))}
              aria-describedby={showError('gender') ? 'err-gender' : undefined}
              className={`select ${showError('gender') ? 'input-error' : ''}`}
            >
              <option value="">Select</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            {showError('gender') && (
              <p id="err-gender" className="mt-1.5 text-[12.5px] font-medium text-danger-600">
                {errors.gender}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="patient-symptoms">
            Symptoms or reason for visit <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="patient-symptoms"
            value={values.symptoms}
            onChange={setField('symptoms')}
            rows={3}
            maxLength={500}
            className="textarea"
            placeholder="Briefly describe the symptoms, how long they've lasted, and any current medication."
          />
          <p className="mt-1.5 text-right text-[11.5px] text-slate-400">{values.symptoms.length}/500</p>
        </div>
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[12px] leading-snug text-slate-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mint-600" aria-hidden="true" />
        This is a demo build with no backend — details you enter are saved only in this browser's local storage and are
        never transmitted anywhere.
      </p>

      <button type="submit" disabled={submitting} className="btn-primary mt-5 w-full">
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Confirming…
          </>
        ) : (
          <>
            <CalendarCheck className="h-4 w-4" aria-hidden="true" />
            Confirm appointment
          </>
        )}
      </button>
    </form>
  );
}
