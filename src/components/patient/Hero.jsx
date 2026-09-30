import { useDispatch } from 'react-redux';
import { ArrowRight, BadgeCheck, CalendarPlus, MapPin, Phone, Search, ShieldCheck } from 'lucide-react';

import { HOSPITAL, MEDIA, STATS, photo } from '../../config/hospital';
import { resolveIcon } from '../../utils/icons';
import { openBooking, setActiveTab } from '../../store/uiSlice';

/**
 * Hero built on the hospital's real front elevation.
 *
 * Legibility approach: rather than one flat wash, the photo sits under three
 * stacked layers — a vertical darkening gradient, a horizontal one that keeps
 * the right side of the building visible on wide screens, and a soft bottom
 * scrim directly behind the copy. That holds white text well above the 4.5:1
 * contrast floor no matter how bright the photo is, while still letting the
 * building read as a photograph.
 */
export default function Hero() {
  const dispatch = useDispatch();

  return (
    <section className="relative isolate overflow-hidden bg-primary-950">
      {/* Authentic building photo — shantihospital.in */}
      <picture>
        <source media="(min-width: 1280px)" srcSet={photo(MEDIA.buildingFront, 1920, 1000)} />
        <source media="(min-width: 640px)" srcSet={photo(MEDIA.buildingFront, 1280, 860)} />
        <img
          src={photo(MEDIA.buildingFront, 900, 1100)}
          alt={`${HOSPITAL.name} main building at Navanagar, ${HOSPITAL.city}`}
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </picture>

      {/* Layer 1 — overall darkening so the photo never competes with text */}
      <div className="absolute inset-0 bg-primary-950/72 sm:bg-primary-950/60" aria-hidden="true" />
      {/* Layer 2 — directional falloff, keeps the building readable on the right */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-primary-950 via-primary-950/55 to-primary-950/85
                   sm:bg-gradient-to-r sm:from-primary-950 sm:via-primary-950/70 sm:to-transparent"
        aria-hidden="true"
      />
      {/* Layer 3 — subtle brand tint for depth */}
      <div
        className="absolute inset-0 bg-gradient-to-tr from-primary-900/40 via-transparent to-mint-900/20"
        aria-hidden="true"
      />

      <div className="container-app relative py-14 sm:py-20 lg:py-28">
        <div className="max-w-2xl">
          <span className="inline-flex animate-fade-in items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[12px] font-bold text-white shadow-sm backdrop-blur-md">
            <BadgeCheck className="h-3.5 w-3.5 text-mint-300" aria-hidden="true" />
            Serving Bagalkot since {HOSPITAL.established}
            <span className="h-1 w-1 rounded-full bg-white/40" aria-hidden="true" />
            {HOSPITAL.beds} beds
          </span>

          <h1
            className="mt-5 animate-fade-in-up text-[2.1rem] font-bold leading-[1.08] tracking-tight text-white
                       [text-shadow:0_2px_24px_rgb(7_41_72_/_0.55)] sm:text-[3.1rem] lg:text-[3.6rem]"
          >
            Multi-speciality care,
            <span className="mt-1 block bg-gradient-to-r from-mint-300 to-mint-200 bg-clip-text text-transparent">
              closer to home.
            </span>
          </h1>

          <p className="mt-4 max-w-xl animate-fade-in-up text-[15px] leading-relaxed text-primary-50/95 [text-shadow:0_1px_12px_rgb(7_41_72_/_0.5)] sm:text-[17px]">
            A 200-bedded multi-speciality hospital with 24×7 emergency and trauma cover, a Level-III NICU, the region&apos;s
            first tertiary PICU, and newly launched Cardiology &amp; Hemato-Oncology services.
          </p>

          {/* Primary actions */}
          <div className="mt-7 flex animate-fade-in-up flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => dispatch(openBooking({}))}
              className="btn w-full bg-white text-primary-800 shadow-lg shadow-primary-950/30 hover:bg-primary-50 sm:w-auto"
            >
              <CalendarPlus className="h-4.5 w-4.5" aria-hidden="true" />
              Book Appointment
            </button>
            <button
              type="button"
              onClick={() => dispatch(setActiveTab('doctors'))}
              className="btn w-full border border-white/30 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 sm:w-auto"
            >
              <Search className="h-4.5 w-4.5" aria-hidden="true" />
              Find a Doctor
            </button>
            <a
              href={`tel:${HOSPITAL.emergency.replace(/\s/g, '')}`}
              className="btn w-full bg-danger-600 text-white shadow-lg shadow-danger-900/30 hover:bg-danger-700 sm:w-auto"
            >
              <Phone className="h-4.5 w-4.5" aria-hidden="true" />
              Emergency
            </a>
          </div>

          {/* Reassurance row */}
          <div className="mt-6 flex animate-fade-in flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] font-semibold text-primary-100">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-mint-300" aria-hidden="true" />
              Ayushman Bharat &amp; Arogya Karnataka accepted
            </span>
            <a
              href={HOSPITAL.mapsUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="group inline-flex items-center gap-1.5 transition-colors hover:text-white"
            >
              <MapPin className="h-4 w-4 text-mint-300" aria-hidden="true" />
              {HOSPITAL.addressShort}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      {/* Trust metrics — 2×2 on phones so all four stay visible, one row from sm.
          (A horizontal scroll rail here silently hid half the numbers.) */}
      <div className="relative border-t border-white/15 bg-primary-950/60 backdrop-blur-md">
        <div className="container-app">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 py-4 sm:grid-cols-4 sm:gap-4 sm:py-5">
            {STATS.map((stat) => {
              const Icon = resolveIcon(stat.icon);
              return (
                <div key={stat.id} className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-mint-300 ring-1 ring-white/10 sm:h-10 sm:w-10">
                    <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <dd className="font-display text-[17px] font-bold leading-none text-white sm:text-lg">{stat.value}</dd>
                    <dt className="mt-1 truncate text-[11px] font-medium text-primary-200 sm:text-[11.5px]">
                      {stat.label}
                    </dt>
                  </span>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </section>
  );
}
