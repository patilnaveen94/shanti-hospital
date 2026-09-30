import { BadgeCheck, Clock, HeartHandshake, Microscope, ShieldCheck, Stethoscope } from 'lucide-react';

import { SectionHeading } from '../common/Bits';

/** Real, verifiable schemes listed on the hospital's Facilities page. */
const SCHEMES = [
  'Ayushman Bharat – Arogya Karnataka',
  'Jyoti Sanjeevini Scheme',
  'Rajeev Arogya Bhagya Scheme',
  'Government Employee Reimbursement',
];

const PILLARS = [
  {
    id: 'critical',
    icon: Stethoscope,
    title: 'Region-first critical care',
    body: 'The first tertiary paediatric intensive care and neonatology units in Bagalkot, plus a 20-bed adult ICU and a dedicated surgical ICU.',
    tone: 'bg-primary-50 text-primary-700',
  },
  {
    id: 'theatres',
    icon: HeartHandshake,
    title: 'Five operation theatres',
    body: 'Built to international sterilisation standards with C-arm, operating microscope, image intensifier and anaesthesia workstations.',
    tone: 'bg-mint-50 text-mint-700',
  },
  {
    id: 'diagnostics',
    icon: Microscope,
    title: 'Diagnostics under one roof',
    body: 'CT, X-ray and ultrasonography alongside ECG/ECHO/TMT, EEG, NCV, EMG and a full clinical laboratory.',
    tone: 'bg-violet-50 text-violet-700',
  },
  {
    id: 'hours',
    icon: Clock,
    title: 'Open around the clock',
    body: 'Casualty, a 24-hour pharmacy, labour room and vaccination unit operate every day of the year.',
    tone: 'bg-amber-50 text-amber-700',
  },
];

/** Credibility section: why patients choose Shanti, plus cashless schemes. */
export default function TrustStrip() {
  return (
    <section className="section-pad bg-white">
      <div className="container-app">
        <SectionHeading
          eyebrow="Why Shanti"
          title="Tertiary care without leaving the district"
          description="Nearly four decades of building capability locally, so families are not forced to travel to a metro for specialist treatment."
        />

        <div className="grid gap-3.5 sm:grid-cols-2">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <article key={pillar.id} className="card flex gap-4 p-5 transition-shadow duration-300 hover:shadow-card-hover">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${pillar.tone}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-bold leading-snug text-slate-900">{pillar.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600">{pillar.body}</p>
                </div>
              </article>
            );
          })}
        </div>

        {/* Cashless schemes */}
        <div className="mt-5 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-800 to-primary-950 p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15 text-mint-300">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="text-[15px] font-bold text-white sm:text-base">Cashless &amp; government health schemes</h3>
              <p className="mt-1 text-[13.5px] leading-relaxed text-primary-100">
                Treatment is covered under the following schemes. Please carry a valid photo ID and your scheme card.
              </p>
            </div>
          </div>

          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {SCHEMES.map((scheme) => (
              <li
                key={scheme}
                className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3.5 py-2.5 text-[13px] font-semibold text-white backdrop-blur-sm"
              >
                <BadgeCheck className="h-4 w-4 shrink-0 text-mint-300" aria-hidden="true" />
                {scheme}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
