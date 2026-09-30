import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SearchX, Sparkles, UserSearch, X } from 'lucide-react';

import DoctorCard from './DoctorCard';
import { EmptyState, SectionHeading, Toggle } from '../common/Bits';
import { selectDepartments } from '../../store/departmentsSlice';
import { selectDoctors } from '../../store/doctorsSlice';
import {
  clearDoctorFilters,
  selectDoctorFilters,
  setDoctorDepartmentFilter,
  setDoctorSearch,
  toggleOnlyAvailable,
} from '../../store/uiSlice';

/**
 * Searchable, filterable consultant directory.
 *
 * Filter state lives in Redux so a department card tap on the homepage can
 * deep-link straight into a pre-filtered directory.
 */
export default function DoctorDirectory({ heading = true, limit }) {
  const dispatch = useDispatch();
  const doctors = useSelector(selectDoctors);
  const departments = useSelector(selectDepartments);
  const { search, departmentId, onlyAvailable } = useSelector(selectDoctorFilters);

  const departmentsById = useMemo(
    () => departments.reduce((acc, d) => ({ ...acc, [d.id]: d }), {}),
    [departments]
  );

  const results = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return doctors.filter((doctor) => {
      if (departmentId !== 'all' && doctor.departmentId !== departmentId) return false;
      if (onlyAvailable && !doctor.available) return false;
      if (!needle) return true;

      // Match across name, speciality, qualification and department label so a
      // patient searching "heart" or "child" still lands somewhere sensible.
      const haystack = [
        doctor.name,
        doctor.specialization,
        doctor.qualification,
        departmentsById[doctor.departmentId]?.name,
        ...(doctor.languages || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [doctors, departmentId, onlyAvailable, search, departmentsById]);

  const shown = limit ? results.slice(0, limit) : results;
  const hasFilters = Boolean(search.trim()) || departmentId !== 'all' || onlyAvailable;
  const activeDepartment = departmentsById[departmentId];

  return (
    <section id="doctors" className="section-pad">
      <div className="container-app">
        {heading && (
          <SectionHeading
            eyebrow="Our consultants"
            title="Find a doctor"
            description="Search by name or speciality, or filter by department. Tap Book Appointment on any card to reserve an OPD slot."
          />
        )}

        {/* Search */}
        <div className="relative">
          <UserSearch className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => dispatch(setDoctorSearch(event.target.value))}
            placeholder="Search doctors, specialities, languages…"
            aria-label="Search doctors"
            className="input pl-11 pr-11"
          />
          {Boolean(search) && (
            <button
              type="button"
              onClick={() => dispatch(setDoctorSearch(''))}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Department chips — horizontal snap rail on mobile */}
        <div className="-mx-4 mt-3.5 px-4 sm:mx-0 sm:px-0">
          <div className="snap-rail pb-1">
            <button
              type="button"
              onClick={() => dispatch(setDoctorDepartmentFilter('all'))}
              aria-pressed={departmentId === 'all'}
              className={`chip snap-start ${departmentId === 'all' ? 'chip-active' : ''}`}
            >
              All
              <span className={`rounded-full px-1.5 text-[11px] ${departmentId === 'all' ? 'bg-white/20' : 'bg-slate-100'}`}>
                {doctors.length}
              </span>
            </button>

            {departments.map((department) => {
              const count = doctors.filter((d) => d.departmentId === department.id).length;
              const active = departmentId === department.id;
              return (
                <button
                  key={department.id}
                  type="button"
                  onClick={() => dispatch(setDoctorDepartmentFilter(department.id))}
                  aria-pressed={active}
                  className={`chip snap-start ${active ? 'chip-active' : ''}`}
                >
                  {department.isNew && <Sparkles className={`h-3.5 w-3.5 ${active ? 'text-white' : 'text-mint-600'}`} aria-hidden="true" />}
                  {department.name}
                  <span className={`rounded-full px-1.5 text-[11px] ${active ? 'bg-white/20' : 'bg-slate-100'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Result meta */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <p className="text-[13px] text-slate-600">
            <strong className="font-bold text-slate-900">{results.length}</strong>{' '}
            {results.length === 1 ? 'doctor' : 'doctors'}
            {activeDepartment && <> in <strong className="font-semibold text-slate-800">{activeDepartment.name}</strong></>}
            {limit && results.length > limit && <> · showing first {limit}</>}
          </p>

          <div className="flex items-center gap-4">
            <Toggle
              id="only-available"
              checked={onlyAvailable}
              onChange={() => dispatch(toggleOnlyAvailable())}
              label="Available only"
            />
            {hasFilters && (
              <button
                type="button"
                onClick={() => dispatch(clearDoctorFilters())}
                className="text-[13px] font-bold text-primary-700 underline-offset-2 hover:underline"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {shown.length ? (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {shown.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} department={departmentsById[doctor.departmentId]} />
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              icon={SearchX}
              title="No doctors match that search"
              description="Try a different speciality, clear the filters, or call the front desk and we'll guide you to the right consultant."
              action={
                <button type="button" onClick={() => dispatch(clearDoctorFilters())} className="btn-secondary btn-sm">
                  Clear all filters
                </button>
              }
            />
          </div>
        )}
      </div>
    </section>
  );
}
