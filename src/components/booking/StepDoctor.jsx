import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronRight, Clock, IndianRupee, UserX } from 'lucide-react';

import { EmptyState, SmartImage } from '../common/Bits';
import { formatOpdWindow, selectDoctors } from '../../store/doctorsSlice';
import { selectDepartments } from '../../store/departmentsSlice';
import { selectSettings } from '../../store/settingsSlice';
import { isFeeVisible } from '../../utils/fees';
import { chooseBookingDoctor, setBookingStep } from '../../store/uiSlice';
import { initialsAvatar } from '../../utils/format';

/** Step 2 — pick a consultant within the chosen department. */
export default function StepDoctor({ departmentId }) {
  const dispatch = useDispatch();
  const doctors = useSelector(selectDoctors);
  const departments = useSelector(selectDepartments);
  const settings = useSelector(selectSettings);

  const department = departments.find((d) => d.id === departmentId);

  // Available consultants first; on-leave doctors stay visible but disabled.
  const list = useMemo(
    () =>
      doctors
        .filter((d) => d.departmentId === departmentId)
        .slice()
        .sort((a, b) => Number(b.available) - Number(a.available) || b.experience - a.experience),
    [doctors, departmentId]
  );

  if (!list.length) {
    return (
      <EmptyState
        icon={UserX}
        title="No doctors in this department yet"
        description="Please pick another department, or call the hospital and we'll help you find the right consultant."
        action={
          <button type="button" onClick={() => dispatch(setBookingStep('department'))} className="btn-secondary btn-sm">
            Choose another department
          </button>
        }
      />
    );
  }

  return (
    <div>
      {department && (
        <p className="mb-3 text-[13px] text-slate-500">
          Consultants in <strong className="font-semibold text-slate-700">{department.name}</strong>
        </p>
      )}

      <ul className="space-y-2">
        {list.map((doctor) => {
          const monogram = initialsAvatar(doctor.name);

          return (
            <li key={doctor.id}>
              <button
                type="button"
                disabled={!doctor.available}
                onClick={() => dispatch(chooseBookingDoctor(doctor.id))}
                className="group flex w-full items-start gap-3.5 rounded-2xl border border-slate-200 bg-white p-3.5 text-left
                           transition-all duration-200 ease-spring hover:border-primary-300 hover:bg-primary-50/40
                           active:scale-[.99] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 disabled:hover:border-slate-200"
              >
                <SmartImage
                  src={doctor.photo || monogram}
                  alt={doctor.name}
                  className="h-14 w-14 shrink-0 rounded-xl"
                  fallback={<img src={monogram} alt="" className="h-full w-full object-cover" />}
                />

                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-snug text-slate-900">{doctor.name}</span>

                  <span className="mt-0.5 block text-[12.5px] font-semibold text-primary-700">{doctor.specialization}</span>

                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {formatOpdWindow(doctor)}
                    </span>
                    {isFeeVisible(doctor, settings) && (
                      <span className="inline-flex items-center gap-0.5">
                        <IndianRupee className="h-3 w-3" aria-hidden="true" />
                        {doctor.fee}
                      </span>
                    )}
                    {doctor.experience > 0 && <span>{doctor.experience} yrs exp</span>}
                  </span>

                  {!doctor.available && (
                    <span className="mt-1.5 inline-block rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                      Currently on leave
                    </span>
                  )}
                </span>

                <ChevronRight
                  className="mt-4 h-5 w-5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-600"
                  aria-hidden="true"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
