import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronRight, Search, Sparkles } from 'lucide-react';

import { EmptyState } from '../common/Bits';
import { resolveAccent, resolveIcon } from '../../utils/icons';
import { selectDepartments, selectDoctorCountByDepartment } from '../../store/departmentsSlice';
import { chooseBookingDepartment } from '../../store/uiSlice';

/** Step 1 — department picker with a local search box. */
export default function StepDepartment() {
  const dispatch = useDispatch();
  const departments = useSelector(selectDepartments);
  const counts = useSelector(selectDoctorCountByDepartment);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return departments;
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(needle) ||
        d.description?.toLowerCase().includes(needle) ||
        d.services?.some((s) => s.toLowerCase().includes(needle))
    );
  }, [departments, query]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search departments or symptoms…"
          aria-label="Search departments"
          className="input pl-10"
          autoFocus
        />
      </div>

      {results.length ? (
        <ul className="mt-3.5 space-y-2">
          {results.map((department) => {
            const Icon = resolveIcon(department.icon);
            const accent = resolveAccent(department.accent);
            const count = counts[department.id] || 0;

            return (
              <li key={department.id}>
                <button
                  type="button"
                  disabled={count === 0}
                  onClick={() => dispatch(chooseBookingDepartment(department.id))}
                  className="group flex w-full items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-3.5 text-left
                             transition-all duration-200 ease-spring hover:border-primary-300 hover:bg-primary-50/40
                             active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-white"
                >
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${accent.icon}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-slate-900">{department.name}</span>
                      {department.isNew && (
                        <span className="badge bg-mint-100 text-mint-700">
                          <Sparkles className="h-3 w-3" aria-hidden="true" />
                          New
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-slate-500">
                      {count > 0 ? `${count} ${count === 1 ? 'doctor' : 'doctors'} available` : 'No doctors listed yet'}
                    </span>
                  </span>

                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-600"
                    aria-hidden="true"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4">
          <EmptyState compact title="No department matches that" description="Try a broader term, or call reception for guidance." />
        </div>
      )}
    </div>
  );
}
