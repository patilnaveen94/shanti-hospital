import { useDispatch } from 'react-redux';
import { CalendarPlus, MapPin, Quote } from 'lucide-react';

import PageBanner from '../components/layout/PageBanner';
import AboutSection from '../components/patient/AboutSection';
import FacilityGallery from '../components/patient/FacilityGallery';
import {
  CommitmentsGrid,
  LeadershipSection,
  MilestonesTimeline,
  PhilanthropySection,
  TestimonialsSection,
} from '../components/patient/StorySections';
import { SectionHeading } from '../components/common/Bits';
import { HOSPITAL, MEDIA, STATS } from '../config/hospital';
import { ABOUT_INTRO } from '../config/content';
import { resolveIcon } from '../utils/icons';
import { openBooking } from '../store/uiSlice';

export default function AboutPage() {
  const dispatch = useDispatch();

  return (
    <>
      <PageBanner
        eyebrow="About us"
        title="A pioneer of paediatric care in North Karnataka"
        description={`${HOSPITAL.name} stands in the district headquarters of ${HOSPITAL.city} — a ${HOSPITAL.beds}-bedded multi-speciality institution built over nearly four decades of local service.`}
        image={MEDIA.buildingDusk}
        imageAlt={`${HOSPITAL.name} campus at Navanagar, ${HOSPITAL.city}`}
      >
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <button type="button" onClick={() => dispatch(openBooking({}))} className="btn w-full bg-white text-primary-800 hover:bg-primary-50 sm:w-auto">
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Book Appointment
          </button>
          <a
            href={HOSPITAL.mapsUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="btn w-full border border-white/30 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 sm:w-auto"
          >
            <MapPin className="h-4 w-4" aria-hidden="true" />
            Find us
          </a>
        </div>
      </PageBanner>

      {/* Positioning statement from the hospital's About Us page */}
      <section className="section-pad bg-white">
        <div className="container-app">
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <SectionHeading eyebrow="Who we are" title="Care that treats the hospital as your home" />
              <div className="space-y-4">
                {ABOUT_INTRO.map((p) => (
                  <p key={p.slice(0, 28)} className="text-[15px] leading-relaxed text-slate-600">
                    {p}
                  </p>
                ))}
              </div>

              <figure className="mt-6 rounded-2xl border-l-4 border-mint-500 bg-mint-50/60 p-5">
                <Quote className="h-5 w-5 text-mint-600" aria-hidden="true" />
                <blockquote className="mt-2 font-display text-lg font-bold leading-snug text-slate-800">
                  “{HOSPITAL.motto}”
                </blockquote>
                <figcaption className="mt-1.5 text-[13px] font-medium text-slate-500">
                  — The Shanti Team, {HOSPITAL.city}
                </figcaption>
              </figure>
            </div>

            {/* Key numbers */}
            <div className="lg:col-span-5">
              <dl className="grid grid-cols-2 gap-3">
                {STATS.map((stat) => {
                  const Icon = resolveIcon(stat.icon);
                  return (
                    <div key={stat.id} className="card p-5">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary-700">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <dd className="mt-3 font-display text-2xl font-bold leading-none text-slate-900">{stat.value}</dd>
                      <dt className="mt-1.5 text-[12.5px] font-medium leading-snug text-slate-500">{stat.label}</dt>
                    </div>
                  );
                })}
              </dl>

              <div className="card mt-3 bg-gradient-to-br from-primary-50 to-mint-50 p-5">
                <p className="text-[13px] font-semibold uppercase tracking-wider text-primary-700">Since 1986</p>
                <p className="mt-2 text-[14px] leading-relaxed text-slate-700">
                  More than <strong className="font-bold">2.5 lakh</strong> paediatric in-patients treated and over{' '}
                  <strong className="font-bold">20 lakh</strong> out-patient visits cared for by our General Paediatrics
                  department alone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MilestonesTimeline />
      <LeadershipSection />
      <AboutSection />
      <CommitmentsGrid />
      <PhilanthropySection />
      <FacilityGallery />
      <TestimonialsSection />
    </>
  );
}
