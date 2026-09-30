import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowRight, Check, Sparkles, Users } from 'lucide-react';

import { SectionHeading } from '../common/Bits';
import Modal from '../common/Modal';
import { resolveAccent, resolveIcon } from '../../utils/icons';
import { selectDepartments, selectDoctorCountByDepartment } from '../../store/departmentsSlice';
import { browseDepartment, openBooking } from '../../store/uiSlice';

function DepartmentCard({ department, doctorCount, onOpen }) {
  const Icon = resolveIcon(department.icon);
  const accent = resolveAccent(department.accent);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`card-interactive group relative flex h-full flex-col items-start overflow-hidden p-5 text-left ${accent.ring}`}
    >
      <span
        className={`absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 transition-transform duration-300 ease-spring group-hover:scale-x-100 ${accent.bar}`}
        aria-hidden="true"
      />

      <span
        className={`grid h-12 w-12 place-items-center rounded-xl transition-transform duration-300 ease-spring group-hover:-rotate-6 group-hover:scale-110 ${accent.icon}`}
      >
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>

      <span className="mt-4 flex flex-wrap items-center gap-2">
        <span className="font-display text-[15px] font-bold leading-snug text-slate-900">{department.name}</span>
        {department.isNew && (
          <span className="badge bg-mint-100 text-mint-700">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            New
          </span>
        )}
      </span>

      <span className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-slate-600">{department.description}</span>

      <span className="mt-auto flex w-full items-center justify-between pt-4">
        {doctorCount > 0 ? (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${accent.chip}`}>
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {doctorCount} {doctorCount === 1 ? 'consultant' : 'consultants'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] font-bold text-slate-500">
            Facility service
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-slate-400 transition-colors group-hover:text-primary-600">
          Details
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}

/** Interactive department explorer, grouped into Adult / Paediatric / Support. */
export default function DepartmentExplorer() {
  const dispatch = useDispatch();
  const departments = useSelector(selectDepartments);
  const counts = useSelector(selectDoctorCountByDepartment);
  const [active, setActive] = useState(null);
  const [group, setGroup] = useState('All');
  const [showAll, setShowAll] = useState(false);

  // Derive tabs from the data so admin-added groups appear automatically.
  const groups = useMemo(() => {
    const seen = [];
    departments.forEach((d) => {
      const g = d.group || 'Adult';
      if (!seen.includes(g)) seen.push(g);
    });
    return ['All', ...seen];
  }, [departments]);

  const filtered = useMemo(
    () => (group === 'All' ? departments : departments.filter((d) => (d.group || 'Adult') === group)),
    [departments, group]
  );

  const visible = showAll ? filtered : filtered.slice(0, 6);
  const Icon = active ? resolveIcon(active.icon) : null;
  const accent = active ? resolveAccent(active.accent) : null;
  const activeCount = counts[active?.id] || 0;

  return (
    <section id="departments" className="section-pad">
      <div className="container-app">
        <SectionHeading
          eyebrow="Specialities"
          title="Explore our departments"
          description={`${departments.length} departments under one roof — adult and paediatric super-specialities supported by in-house diagnostics, five operation theatres and intensivist-led critical care.`}
        />

        {/* Group tabs */}
        <div className="-mx-4 mb-5 px-4 sm:mx-0 sm:px-0">
          <div className="snap-rail pb-1" role="tablist" aria-label="Department groups">
            {groups.map((g) => {
              const on = group === g;
              const count = g === 'All' ? departments.length : departments.filter((d) => (d.group || 'Adult') === g).length;
              return (
                <button
                  key={g}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => {
                    setGroup(g);
                    setShowAll(false);
                  }}
                  className={`chip snap-start ${on ? 'chip-active' : ''}`}
                >
                  {g}
                  <span className={`rounded-full px-1.5 text-[11px] ${on ? 'bg-white/20' : 'bg-slate-100'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((department) => (
            <DepartmentCard
              key={department.id}
              department={department}
              doctorCount={counts[department.id] || 0}
              onOpen={() => setActive(department)}
            />
          ))}
        </div>

        {filtered.length > 6 && (
          <div className="mt-6 flex justify-center">
            <button type="button" onClick={() => setShowAll((s) => !s)} className="btn-secondary">
              {showAll ? 'Show fewer' : `Show all ${filtered.length} departments`}
              <ArrowRight className={`h-4 w-4 transition-transform ${showAll ? '-rotate-90' : 'rotate-90'}`} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title={active?.name}
        subtitle={activeCount > 0 ? `${activeCount} consultant${activeCount === 1 ? '' : 's'}` : active?.group}
        footer={
          <div className="flex flex-col gap-2.5 sm:flex-row">
            {activeCount > 0 && (
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => {
                  dispatch(browseDepartment(active.id));
                  setActive(null);
                }}
              >
                View consultants
              </button>
            )}
            <button
              type="button"
              className="btn-primary flex-1"
              disabled={activeCount === 0}
              onClick={() => {
                dispatch(openBooking({ departmentId: active.id }));
                setActive(null);
              }}
            >
              {activeCount > 0 ? 'Book appointment' : 'Call reception to book'}
            </button>
          </div>
        }
      >
        {active && (
          <div>
            <div className="flex items-start gap-4">
              <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${accent.icon}`}>
                <Icon className="h-7 w-7" aria-hidden="true" />
              </span>
              <p className="pt-1 text-[15px] leading-relaxed text-slate-600">{active.description}</p>
            </div>

            {Boolean(active.services?.length) && (
              <div className="mt-6">
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500">What we offer</h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {active.services.map((service) => (
                    <li key={service} className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-3.5 py-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint-600" aria-hidden="true" />
                      <span className="text-[13.5px] font-medium leading-snug text-slate-700">{service}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </section>
  );
}
