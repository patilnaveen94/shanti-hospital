import { Check, Quote } from 'lucide-react';

import { HOSPITAL, MEDIA, photo } from '../../config/hospital';
import { SmartImage } from '../common/Bits';

/**
 * "About Us" banner anchored on the hospital's real campus photograph,
 * with copy drawn from the hospital's own site.
 */
export default function AboutSection() {
  return (
    <section id="about" className="section-pad bg-white">
      <div className="container-app">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
          {/* Campus photo */}
          <div className="relative">
            <SmartImage
              src={photo(MEDIA.buildingDusk, 1000, 860)}
              alt={`${HOSPITAL.name} campus and new in-patient wing`}
              className="aspect-[6/5] w-full rounded-3xl shadow-card-hover"
            />

            <div className="absolute -bottom-5 left-4 right-4 rounded-2xl border border-slate-100 bg-white/95 p-4 shadow-card-hover backdrop-blur sm:left-6 sm:right-auto sm:max-w-[16rem]">
              <p className="font-display text-3xl font-bold leading-none text-primary-700">
                {new Date().getFullYear() - HOSPITAL.established}
                <span className="text-xl">+</span>
              </p>
              <p className="mt-1 text-[13px] font-semibold leading-snug text-slate-600">
                years of service to Bagalkot and its surrounding districts
              </p>
            </div>
          </div>

          {/* Copy */}
          <div className="pt-8 lg:pt-0">
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-700">
              About us
            </span>
            <h2 className="text-2xl leading-tight sm:text-3xl">
              From a small pediatric centre to a {HOSPITAL.beds}-bed multi-speciality institution
            </h2>

            <div className="mt-4 space-y-3.5">
              {HOSPITAL.about.map((paragraph) => (
                <p key={paragraph.slice(0, 32)} className="text-[15px] leading-relaxed text-slate-600">
                  {paragraph}
                </p>
              ))}
            </div>

            <figure className="mt-6 rounded-2xl border-l-4 border-mint-500 bg-mint-50/60 p-4">
              <Quote className="h-5 w-5 text-mint-600" aria-hidden="true" />
              <blockquote className="mt-2 font-display text-lg font-bold leading-snug text-slate-800">
                “{HOSPITAL.motto}”
              </blockquote>
              <figcaption className="mt-1.5 text-[13px] font-medium text-slate-500">
                — The Shanti Team, {HOSPITAL.city}
              </figcaption>
            </figure>

            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {HOSPITAL.alwaysOn.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-mint-100 text-mint-700">
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                  <span className="text-[13.5px] font-semibold leading-snug text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
