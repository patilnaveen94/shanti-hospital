import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CalendarPlus, Check, Phone, Search, Sparkles, Users, X } from 'lucide-react';

import PageBanner from '../components/layout/PageBanner';
import FacilitiesDetail from '../components/patient/FacilitiesDetail';
import { EmptyState } from '../components/common/Bits';
import { HOSPITAL, MEDIA } from '../config/hospital';
import { resolveAccent, resolveIcon } from '../utils/icons';
import { selectDepartments, selectDoctorCountByDepartment } from '../store/departmentsSlice';
import { browseDepartment, openBooking } from '../store/uiSlice';

/** Expanded department card listing every published service. */
function DepartmentPanel({ department, doctorCount }) {
  const dispatch = useDispatch();
  const Icon = resolveIcon(department.icon);
  const accent = resolveAccent(department.accent);

  return (
    <article className="card overflow-hidden">
      <div className={`h-1 w-full ${accent.bar}`} aria-hidden="true" />

      <div className="p-5">
        <div className="flex items-start gap-3.5">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${accent.icon}`}>
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-[15px] font-bold leading-snug text-slate-900 sm:text-base">
                {department.name}
              </h3>
              {department.isNew && (
                <span className="badge bg-mint-100 text-mint-700">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  New
                </span>
              )}
              <span className="badge bg-slate-100 text-slate-500">{department.group || 'Adult'}</span>
            </div>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600">{department.description}</p>
          </div>
        </div>

        {Boolean(department.services?.length) && (
          <ul className="mt-4 grid gap-1.5 border-t border-slate-100 pt-4 sm:grid-cols-2">
            {department.services.map((s) => (
              <li key={s} className="flex items-start gap-2">
                <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-mint-600" aria-hidden="true" />
                <span className="text-[12.5px] leading-snug text-slate-600">{s}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          {doctorCount > 0 ? (
            <>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${accent.chip}`}>
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {doctorCount} {doctorCount === 1 ? 'consultant' : 'consultants'}
              </span>
              <button
                type="button"
                onClick={() => dispatch(browseDepartment(department.id))}
                className="btn-secondary btn-sm ml-auto"
              >
                View consultants
              </button>
              <button
                type="button"
                onClick={() => dispatch(openBooking({ departmentId: department.id }))}
                className="btn-primary btn-sm"
              >
                <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
                Book
              </button>
            </>
          ) : (
            <>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] font-bold text-slate-500">
                Facility service
              </span>
              <a href={`tel:${HOSPITAL.phones[0].replace(/\s/g, '')}`} className="btn-secondary btn-sm ml-auto">
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                Call reception
              </a>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default function DepartmentsPage() {
  const departments = useSelector(selectDepartments);
  const counts = useSelector(selectDoctorCountByDepartment);
  const [group, setGroup] = useState('All');
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const seen = [];
    departments.forEach((d) => {
      const g = d.group || 'Adult';
      if (!seen.includes(g)) seen.push(g);
    });
    return ['All', ...seen];
  }, [departments]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return departments.filter((d) => {
      if (group !== 'All' && (d.group || 'Adult') !== group) return false;
      if (!needle) return true;
      return [d.name, d.description, ...(d.services || [])].join(' ').toLowerCase().includes(needle);
    });
  }, [departments, group, query]);

  return (
    <>
      <PageBanner
        eyebrow="Departments"
        title={`${departments.length} specialities under one roof`}
        description="Adult and paediatric super-specialities, four intensive-care units, a five-theatre complex and in-house diagnostics — all on one campus at Navanagar."
        image={MEDIA.operationTheatre}
        imageAlt="Modular operation theatre at Shanti Hospital"
      />

      <section className="section-pad bg-white">
        <div className="container-app">
          {/* Search */}
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search departments, procedures or services…"
              aria-label="Search departments"
              className="input pl-11 pr-11"
            />
            {Boolean(query) && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Group tabs */}
          <div className="-mx-4 mt-3.5 px-4 sm:mx-0 sm:px-0">
            <div className="snap-rail pb-1" role="tablist" aria-label="Department groups">
              {groups.map((g) => {
                const on = group === g;
                const n = g === 'All' ? departments.length : departments.filter((d) => (d.group || 'Adult') === g).length;
                return (
                  <button
                    key={g}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setGroup(g)}
                    className={`chip snap-start ${on ? 'chip-active' : ''}`}
                  >
                    {g}
                    <span className={`rounded-full px-1.5 text-[11px] ${on ? 'bg-white/20' : 'bg-slate-100'}`}>{n}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-4 border-t border-slate-200 pt-4 text-[13px] text-slate-600">
            <strong className="font-bold text-slate-900">{results.length}</strong>{' '}
            {results.length === 1 ? 'department' : 'departments'}
            {group !== 'All' && <> in {group.toLowerCase()} care</>}
          </p>

          {results.length ? (
            <div className="mt-5 grid gap-3.5 lg:grid-cols-2">
              {results.map((d) => (
                <DepartmentPanel key={d.id} department={d} doctorCount={counts[d.id] || 0} />
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                title="No department matches that search"
                description="Try a broader term, or call reception and we'll point you to the right speciality."
                action={
                  <button type="button" onClick={() => setQuery('')} className="btn-secondary btn-sm">
                    Clear search
                  </button>
                }
              />
            </div>
          )}
        </div>
      </section>

      <FacilitiesDetail />
    </>
  );
}
