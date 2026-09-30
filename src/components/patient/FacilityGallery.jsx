import { useState } from 'react';
import { Maximize2 } from 'lucide-react';

import { FACILITY_GALLERY, HOSPITAL, photo } from '../../config/hospital';
import { SectionHeading, SmartImage } from '../common/Bits';
import Modal from '../common/Modal';

/**
 * Infrastructure highlights — real exterior and interior photographs from the
 * hospital's own site (OT, NICU, wards, campus), with a lightbox on tap.
 *
 * Mobile: horizontal snap rail. Desktop: an asymmetric grid where the first
 * tile spans two columns.
 */
export default function FacilityGallery() {
  const [active, setActive] = useState(null);

  return (
    <section id="facilities" className="section-pad">
      <div className="container-app">
        <SectionHeading
          eyebrow="Infrastructure"
          title="Inside the hospital"
          description={`Real photographs of the ${HOSPITAL.name} campus at Navanagar — modular theatres, a Level-III NICU and continuously monitored in-patient wards.`}
        />
      </div>

      {/* Mobile rail */}
      <div className="sm:hidden">
        <div className="snap-rail px-4 pb-2">
          {FACILITY_GALLERY.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(item)}
              className="group relative w-[16rem] shrink-0 snap-start overflow-hidden rounded-2xl text-left shadow-card"
            >
              <SmartImage src={photo(item.file, 560, 420)} alt={item.title} className="aspect-[4/3] w-full" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent p-3.5 pt-10">
                <span className="badge mb-1.5 bg-white/20 text-white backdrop-blur-sm">{item.tag}</span>
                <span className="block font-display text-[14px] font-bold text-white">{item.title}</span>
                <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-snug text-white/80">{item.caption}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop grid */}
      <div className="container-app hidden sm:block">
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-3">
          {FACILITY_GALLERY.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(item)}
              className={`group relative overflow-hidden rounded-2xl text-left shadow-card transition-shadow duration-300 hover:shadow-card-hover ${
                index === 0 ? 'col-span-2 lg:row-span-2' : ''
              }`}
            >
              <SmartImage
                src={photo(item.file, index === 0 ? 1100 : 620, index === 0 ? 800 : 460)}
                alt={item.title}
                className={`w-full ${index === 0 ? 'aspect-[11/8] lg:h-full' : 'aspect-[4/3]'}`}
                imgClassName="transition-transform duration-500 ease-spring group-hover:scale-105"
              />

              <span className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/25 to-transparent" aria-hidden="true" />

              <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                <Maximize2 className="h-4 w-4" aria-hidden="true" />
              </span>

              <span className="absolute inset-x-0 bottom-0 p-4">
                <span className="badge mb-1.5 bg-white/20 text-white backdrop-blur-sm">{item.tag}</span>
                <span className={`block font-display font-bold text-white ${index === 0 ? 'text-lg' : 'text-[15px]'}`}>
                  {item.title}
                </span>
                <span className="mt-0.5 block text-[12px] leading-snug text-white/85">{item.caption}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <Modal open={Boolean(active)} onClose={() => setActive(null)} title={active?.title} subtitle={active?.tag} size="lg">
        {active && (
          <>
            <SmartImage
              src={photo(active.file, 1400, 1000, 'fit')}
              alt={active.title}
              className="w-full rounded-2xl bg-slate-900"
              imgClassName="object-contain"
              loading="eager"
            />
            <p className="mt-4 text-[14.5px] leading-relaxed text-slate-600">{active.caption}</p>
            <p className="mt-2 text-[12px] text-slate-400">Photograph courtesy {HOSPITAL.name}, {HOSPITAL.city}.</p>
          </>
        )}
      </Modal>
    </section>
  );
}
