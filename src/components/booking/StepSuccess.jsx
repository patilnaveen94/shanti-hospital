import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Check, CheckCircle2, Copy, Info, MapPin, Phone } from 'lucide-react';

import { HOSPITAL } from '../../config/hospital';
import { to12h } from '../../store/doctorsSlice';
import { closeBooking, pushToast, setActiveTab } from '../../store/uiSlice';
import { formatLongDate } from '../../utils/format';

/** Step 5 — confirmation with a copyable reference ID. */
export default function StepSuccess({ refId, doctor, department, booking }) {
  const dispatch = useDispatch();
  const [copied, setCopied] = useState(false);

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(refId);
      setCopied(true);
      dispatch(pushToast('Reference number copied', 'success'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API needs a secure context; the number is on screen anyway.
      dispatch(pushToast('Could not copy — please note the number down', 'error'));
    }
  };

  return (
    <div className="text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-mint-100 text-mint-600">
        <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
      </span>

      <h3 className="mt-4 text-xl font-bold text-slate-900">You&apos;re all set</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-[14px] leading-relaxed text-slate-600">
        Our front desk will call you shortly to confirm. Please carry this reference number and any previous medical
        records.
      </p>

      {/* Reference */}
      <div className="mt-5 rounded-2xl border-2 border-dashed border-mint-300 bg-mint-50/60 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-mint-700">Appointment reference</p>
        <p className="mt-1 font-display text-3xl font-bold tracking-wider text-slate-900">{refId}</p>
        <button type="button" onClick={copyRef} className="btn-secondary btn-sm mx-auto mt-3">
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-mint-600" aria-hidden="true" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              Copy reference
            </>
          )}
        </button>
      </div>

      {/* Recap */}
      <dl className="mt-5 space-y-2 rounded-2xl bg-slate-50 p-4 text-left text-[13.5px]">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Patient</dt>
          <dd className="text-right font-semibold text-slate-900">{booking.patientName || '—'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Doctor</dt>
          <dd className="text-right font-semibold text-slate-900">{doctor?.name}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Department</dt>
          <dd className="text-right font-semibold text-slate-900">{department?.name}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Date</dt>
          <dd className="text-right font-semibold text-slate-900">{formatLongDate(booking.date)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Reporting time</dt>
          <dd className="text-right font-semibold text-slate-900">{to12h(booking.slot)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-slate-200 pt-2">
          <dt className="text-slate-500">Status</dt>
          <dd className="text-right">
            <span className="badge bg-amber-100 text-amber-800">Pending confirmation</span>
          </dd>
        </div>
      </dl>

      <p className="mt-4 flex items-start gap-2 rounded-xl bg-primary-50 p-3 text-left text-[12px] leading-snug text-primary-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden="true" />
        Please arrive 15 minutes early for registration at the OPD counter, {HOSPITAL.address.split(',')[0]}.
      </p>

      <div className="mt-5 space-y-2.5">
        <a href={`tel:${HOSPITAL.phones[0].replace(/\s/g, '')}`} className="btn-secondary w-full">
          <Phone className="h-4 w-4" aria-hidden="true" />
          Call reception · {HOSPITAL.phones[0]}
        </a>
        <a href={HOSPITAL.mapsUrl} target="_blank" rel="noreferrer noopener" className="btn-secondary w-full">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          Get directions
        </a>
        <button
          type="button"
          onClick={() => {
            dispatch(closeBooking());
            dispatch(setActiveTab('home'));
          }}
          className="btn-primary w-full"
        >
          Done
        </button>
      </div>
    </div>
  );
}
