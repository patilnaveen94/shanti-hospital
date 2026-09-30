import { useDispatch } from 'react-redux';
import { Clock, ExternalLink, Mail, MapPin, Phone } from 'lucide-react';

import { HOSPITAL, MEDIA, photo } from '../../config/hospital';
import { BOOK_ACTION, PAGES } from './navItems';
import { openBooking, setActiveTab } from '../../store/uiSlice';

export default function Footer() {
  const dispatch = useDispatch();

  return (
    <footer className="mt-4 bg-primary-950 text-primary-100">
      <div className="container-app grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:py-14">
        <div className="sm:col-span-2 lg:col-span-1">
          <span className="inline-flex rounded-xl bg-white p-2.5">
            <img src={photo(MEDIA.logo, 220, 112, 'fit')} alt={HOSPITAL.name} width="220" height="112" className="h-9 w-auto" />
          </span>
          <p className="mt-4 text-sm leading-relaxed text-primary-200/90">{HOSPITAL.tagline}</p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold text-white">
            “{HOSPITAL.motto}”
          </p>
        </div>

        <nav aria-label="Footer navigation">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Explore</h3>
          <ul className="mt-4 space-y-1">
            {PAGES.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => dispatch(setActiveTab(item.id))}
                  className="-mx-2 rounded-lg px-2 py-1.5 text-sm text-primary-200 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => dispatch(openBooking({}))}
                className="-mx-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-mint-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                {BOOK_ACTION.label}
              </button>
            </li>
          </ul>
        </nav>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Reach us</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" aria-hidden="true" />
              <a
                href={HOSPITAL.mapsUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="leading-relaxed text-primary-200 transition-colors hover:text-white"
              >
                {HOSPITAL.address}
              </a>
            </li>
            {HOSPITAL.phones.map((phone) => (
              <li key={phone} className="flex gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" aria-hidden="true" />
                <a href={`tel:${phone.replace(/\s/g, '')}`} className="text-primary-200 transition-colors hover:text-white">
                  {phone}
                </a>
              </li>
            ))}
            <li className="flex gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" aria-hidden="true" />
              <a href={`mailto:${HOSPITAL.email}`} className="break-all text-primary-200 transition-colors hover:text-white">
                {HOSPITAL.email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Hours</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" aria-hidden="true" />
              <span className="text-primary-200">
                <strong className="block font-semibold text-white">Emergency</strong>
                Open 24 hours, all days
              </span>
            </li>
            <li className="flex gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" aria-hidden="true" />
              <span className="text-primary-200">
                <strong className="block font-semibold text-white">OPD</strong>
                Mon – Sat, 9:00 AM – 5:00 PM
              </span>
            </li>
          </ul>
          <a
            href={HOSPITAL.website}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-300 transition-colors hover:text-white"
          >
            Official website
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-app flex flex-col gap-1.5 py-5 text-[12px] text-primary-300/80 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {HOSPITAL.name}, {HOSPITAL.city}. All rights reserved.
          </p>
          <p>Demo build — appointment data is stored locally in this browser.</p>
        </div>
      </div>
    </footer>
  );
}
