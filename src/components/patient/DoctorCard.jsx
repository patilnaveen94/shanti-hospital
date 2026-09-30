import { useDispatch, useSelector } from 'react-redux';
import { CalendarPlus, Clock, GraduationCap, IndianRupee, Languages } from 'lucide-react';

import { SmartImage } from '../common/Bits';
import { formatOpdWindow } from '../../store/doctorsSlice';
import { selectSettings } from '../../store/settingsSlice';
import { isFeeVisible } from '../../utils/fees';
import { openBooking } from '../../store/uiSlice';
import { initialsAvatar } from '../../utils/format';
import { resolveAccent, resolveIcon } from '../../utils/icons';

/**
 * Doctor card for the public directory.
 *
 * `photo` is admin-supplied; when it's empty (or fails to load) we fall back to
 * a generated monogram instead of a stock portrait of an unrelated person.
 */
export default function DoctorCard({ doctor, department }) {
  const dispatch = useDispatch();
  const settings = useSelector(selectSettings);
  const showFees = isFeeVisible(doctor, settings);
  const accent = resolveAccent(department?.accent);
  const DeptIcon = resolveIcon(department?.icon);
  const monogram = initialsAvatar(doctor.name);

  return (
    <article className="card flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-card-hover">
      <div className="flex gap-4 p-4 sm:p-5">
        <div className="relative shrink-0">
          <SmartImage
            src={doctor.photo || monogram}
            alt={doctor.name}
            className="h-20 w-20 rounded-2xl sm:h-[5.5rem] sm:w-[5.5rem]"
            fallback={<img src={monogram} alt="" className="h-full w-full object-cover" />}
          />
          <span
            className={`absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full ring-2 ring-white ${accent.icon}`}
            title={department?.name || 'Unassigned'}
          >
            <DeptIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[15px] font-bold leading-snug text-slate-900 sm:text-base">
            {doctor.name}
          </h3>

          <p className="mt-0.5 text-[13px] font-semibold text-primary-700">{doctor.specialization}</p>

          <p className="mt-1.5 flex items-start gap-1.5 text-[12px] leading-snug text-slate-500">
            <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="line-clamp-2">{doctor.qualification}</span>
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${accent.chip}`}>
              {department?.name || 'Unassigned'}
            </span>
            {/* Only shown when the hospital publishes a figure */}
            {doctor.experience > 0 && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                {doctor.experience} yrs exp
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                doctor.available ? 'bg-mint-50 text-mint-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${doctor.available ? 'bg-mint-500' : 'bg-slate-400'}`} aria-hidden="true" />
              {doctor.available ? 'Available' : 'On leave'}
            </span>
          </div>
        </div>
      </div>

      {/* OPD details. The fee column only appears if the hospital has chosen
          to publish fees — see Admin → Settings. */}
      <dl className="mx-4 grid gap-2 rounded-xl bg-slate-50 p-3 text-[12px] sm:mx-5 sm:grid-cols-2">
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-600" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="font-bold text-slate-700">OPD</dt>
            <dd className="text-slate-600">{formatOpdWindow(doctor)}</dd>
            <dd className="mt-0.5 text-[11.5px] text-slate-500">
              {doctor.opdDays?.length ? doctor.opdDays.join(' · ') : 'Days not set'}
            </dd>
          </div>
        </div>

        {showFees ? (
          <div className="flex items-start gap-2">
            <IndianRupee className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint-600" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="font-bold text-slate-700">Consultation</dt>
              <dd className="text-slate-600">₹{doctor.fee}</dd>
              {Boolean(doctor.languages?.length) && (
                <dd className="mt-0.5 flex items-center gap-1 truncate text-[11.5px] text-slate-500">
                  <Languages className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {doctor.languages.join(', ')}
                </dd>
              )}
            </div>
          </div>
        ) : (
          Boolean(doctor.languages?.length) && (
            <div className="flex items-start gap-2">
              <Languages className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint-600" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="font-bold text-slate-700">Languages</dt>
                <dd className="text-slate-600">{doctor.languages.join(', ')}</dd>
              </div>
            </div>
          )
        )}
      </dl>

      {doctor.about && <p className="px-4 pt-3 text-[12.5px] leading-relaxed text-slate-500 sm:px-5">{doctor.about}</p>}

      <div className="mt-auto p-4 pt-3 sm:p-5 sm:pt-4">
        <button
          type="button"
          disabled={!doctor.available}
          onClick={() => dispatch(openBooking({ doctorId: doctor.id, departmentId: doctor.departmentId }))}
          className="btn-primary w-full"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          {doctor.available ? 'Book Appointment' : 'Currently unavailable'}
        </button>
      </div>
    </article>
  );
}
