import { Check, Layers, ShieldCheck } from 'lucide-react';

import { CRITICAL_CARE, SCHEMES, SUPPORT_SERVICES, THEATRE_COMPLEX } from '../../config/content';
import { SectionHeading } from '../common/Bits';
import { resolveAccent, resolveIcon } from '../../utils/icons';

/** Critical-care units, theatre complex, diagnostics and schemes. */
export default function FacilitiesDetail() {
  return (
    <>
      {/* ---------- Intensive care ---------- */}
      <section id="critical-care" className="section-pad bg-white">
        <div className="container-app">
          <SectionHeading
            eyebrow="Intensive care"
            title="Four dedicated critical-care units"
            description="Separate neonatal, paediatric, adult and surgical intensive care, each with its own equipment and staffing model."
          />

          <div className="grid gap-3.5 lg:grid-cols-2">
            {CRITICAL_CARE.map((unit) => {
              const Icon = resolveIcon(unit.icon);
              const accent = resolveAccent(unit.accent);
              return (
                <article key={unit.id} className="card overflow-hidden p-5">
                  <div className="flex items-start gap-3.5">
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${accent.icon}`}>
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-bold leading-snug text-slate-900 sm:text-base">{unit.name}</h3>
                      <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600">{unit.body}</p>
                    </div>
                  </div>

                  <ul className="mt-4 grid gap-1.5 border-t border-slate-100 pt-4 sm:grid-cols-2">
                    {unit.equipment.map((eq) => (
                      <li key={eq} className="flex items-start gap-2">
                        <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-mint-600" aria-hidden="true" />
                        <span className="text-[12.5px] leading-snug text-slate-600">{eq}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- Theatre complex ---------- */}
      <section id="theatres" className="section-pad">
        <div className="container-app">
          <SectionHeading eyebrow="Surgery" title="A five-theatre complex" description={THEATRE_COMPLEX.summary} />

          <div className="grid gap-3.5 lg:grid-cols-5">
            {/* Allocation */}
            <div className="card p-5 lg:col-span-2">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-100 text-primary-700">
                <Layers className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-[15px] font-bold text-slate-900">Theatre allocation</h3>
              <ol className="mt-3 space-y-2">
                {THEATRE_COMPLEX.allocation.map((a, i) => (
                  <li key={a} className="flex items-start gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[11px] font-bold text-primary-700 shadow-sm">
                      {i + 1}
                    </span>
                    <span className="text-[13px] font-medium leading-snug text-slate-700">{a}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
                Supported by a dedicated recovery room and post-operative wards.
              </p>
            </div>

            {/* Equipment */}
            <div className="card p-5 lg:col-span-3">
              <h3 className="text-[15px] font-bold text-slate-900">Theatre equipment</h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {THEATRE_COMPLEX.equipment.map((eq) => (
                  <li
                    key={eq}
                    className="flex items-start gap-2.5 rounded-xl border border-slate-200 px-3.5 py-2.5 transition-colors hover:border-primary-200 hover:bg-primary-50/40"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint-600" aria-hidden="true" />
                    <span className="text-[13px] font-medium leading-snug text-slate-700">{eq}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Diagnostics & support ---------- */}
      <section id="support-services" className="section-pad bg-white">
        <div className="container-app">
          <SectionHeading
            eyebrow="Diagnostics & support"
            title="Everything on one campus"
            description="Imaging, cardiac and neuro testing, pathology, pharmacy and patient education, so referrals rarely leave the building."
          />

          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {SUPPORT_SERVICES.map((s) => {
              const Icon = resolveIcon(s.icon);
              return (
                <li
                  key={s.label}
                  className="card group p-4 transition-all duration-300 ease-spring hover:-translate-y-1 hover:shadow-card-hover"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-primary-700 transition-transform duration-300 ease-spring group-hover:scale-110">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="mt-3 block text-[13.5px] font-bold leading-snug text-slate-900">{s.label}</span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-slate-500">{s.detail}</span>
                </li>
              );
            })}
          </ul>

          {/* Schemes */}
          <div className="mt-6 rounded-3xl border border-mint-200 bg-mint-50/60 p-5 sm:p-7">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint-600 text-white">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-bold text-slate-900 sm:text-base">
                  Cashless &amp; government health schemes
                </h3>
                <p className="mt-1 text-[13.5px] leading-relaxed text-slate-600">
                  Treatment is covered under the schemes below. Please carry a valid photo ID and your scheme card.
                </p>
              </div>
            </div>

            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {SCHEMES.map((scheme) => (
                <li
                  key={scheme}
                  className="flex items-center gap-2.5 rounded-xl bg-white px-3.5 py-2.5 text-[13px] font-semibold text-slate-700 shadow-sm"
                >
                  <Check className="h-4 w-4 shrink-0 text-mint-600" aria-hidden="true" />
                  {scheme}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
