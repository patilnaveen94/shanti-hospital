import { Ambulance, Clock, ExternalLink, Mail, MapPin, Navigation, Phone } from 'lucide-react';

import { HOSPITAL, MEDIA, photo } from '../../config/hospital';
import { SectionHeading, SmartImage } from '../common/Bits';

/** Contact + directions. Every row is a tappable tel:/mailto:/maps link. */
export default function ContactSection() {
  return (
    <section id="contact" className="section-pad bg-white">
      <div className="container-app">
        <SectionHeading
          eyebrow="Visit us"
          title="Reach the hospital"
          description="We're on the main road at Navanagar, Bagalkot — with emergency services open around the clock."
        />

        <div className="grid gap-5 lg:grid-cols-5">
          {/* Contact rows */}
          <div className="space-y-3 lg:col-span-2">
            <a
              href={`tel:${HOSPITAL.emergency.replace(/\s/g, '')}`}
              className="card-interactive flex items-center gap-4 p-4"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-danger-100 text-danger-700">
                <Phone className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-danger-700">Emergency · 24×7</span>
                <span className="block font-display text-lg font-bold text-slate-900">{HOSPITAL.emergency}</span>
              </span>
            </a>

            <a href={`tel:${HOSPITAL.ambulance}`} className="card-interactive flex items-center gap-4 p-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-100 text-primary-700">
                <Ambulance className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Ambulance</span>
                <span className="block font-display text-lg font-bold text-slate-900">{HOSPITAL.ambulance}</span>
              </span>
            </a>

            <div className="card p-4">
              <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                Reception
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {HOSPITAL.phones.map((phone) => (
                  <a key={phone} href={`tel:${phone.replace(/\s/g, '')}`} className="chip">
                    {phone}
                  </a>
                ))}
              </div>
            </div>

            <a href={`mailto:${HOSPITAL.email}`} className="card-interactive flex items-center gap-4 p-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-mint-100 text-mint-700">
                <Mail className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Email</span>
                <span className="block break-all text-[14px] font-semibold text-slate-900">{HOSPITAL.email}</span>
              </span>
            </a>

            <div className="card p-4">
              <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Timings
              </span>
              <dl className="mt-2.5 space-y-2 text-[13.5px]">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="font-semibold text-slate-700">Emergency</dt>
                  <dd className="font-bold text-mint-700">Open 24 hours</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="font-semibold text-slate-700">OPD (Mon – Sat)</dt>
                  <dd className="text-slate-600">9:00 AM – 5:00 PM</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="font-semibold text-slate-700">Public holidays</dt>
                  <dd className="text-slate-600">9:00 AM – 12:30 PM</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Location */}
          <div className="lg:col-span-3">
            <div className="card overflow-hidden">
              <SmartImage
                src={photo(MEDIA.locationMap, 1100, 700)}
                alt="Map showing Shanti Hospital at Navanagar, Bagalkot"
                className="aspect-[16/10] w-full"
              />
              <div className="p-5">
                <h3 className="flex items-start gap-2.5 text-[15px] font-bold text-slate-900">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden="true" />
                  {HOSPITAL.name}, {HOSPITAL.city}
                </h3>
                <p className="mt-1.5 pl-7 text-[14px] leading-relaxed text-slate-600">{HOSPITAL.address}</p>

                <div className="mt-4 flex flex-col gap-2.5 pl-0 sm:flex-row sm:pl-7">
                  <a
                    href={HOSPITAL.mapsUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="btn-primary w-full sm:w-auto"
                  >
                    <Navigation className="h-4 w-4" aria-hidden="true" />
                    Get directions
                  </a>
                  <a
                    href={HOSPITAL.website}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="btn-secondary w-full sm:w-auto"
                  >
                    Official website
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
