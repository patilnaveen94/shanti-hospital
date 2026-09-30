import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  BadgeCheck,
  CalendarPlus,
  Clock,
  GraduationCap,
  PenLine,
  Quote,
  Star,
  Target,
} from 'lucide-react';

import {
  COMMITMENTS,
  LEADERSHIP,
  MILESTONES,
  OBJECTIVE,
  PHILANTHROPY,
  TESTIMONIALS,
} from '../../config/content';
import { MEDIA, photo } from '../../config/hospital';
import { SectionHeading, SmartImage } from '../common/Bits';
import TestimonialForm from './TestimonialForm';
import { formatOpdWindow, selectDoctors } from '../../store/doctorsSlice';
import { loadApprovedTestimonials, selectApprovedTestimonials } from '../../store/testimonialsSlice';
import { openBooking } from '../../store/uiSlice';
import { initialsAvatar } from '../../utils/format';
import { resolveIcon } from '../../utils/icons';

/** The six commitments published on the About Us page. */
export function CommitmentsGrid() {
  return (
    <section className="section-pad bg-white">
      <div className="container-app">
        <SectionHeading
          eyebrow="Our commitments"
          title="What we hold ourselves to"
          description="The standards the hospital publishes for itself, and measures its work against."
        />

        <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {COMMITMENTS.map((item) => {
            const Icon = resolveIcon(item.icon);
            return (
              <li key={item.title} className="card group flex gap-4 p-5 transition-shadow duration-300 hover:shadow-card-hover">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700 transition-transform duration-300 ease-spring group-hover:scale-110">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14.5px] font-bold leading-snug text-slate-900">{item.title}</span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-slate-600">{item.body}</span>
                </span>
              </li>
            );
          })}
        </ul>

        {/* Objective callout */}
        <div className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-primary-800 to-primary-950 p-6 sm:p-9">
          <div className="mx-auto max-w-3xl text-center">
            <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white/15 text-mint-300">
              <Target className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-mint-300">Our objective</h3>
            <p className="mt-3 font-display text-lg font-semibold leading-relaxed text-white sm:text-[1.4rem]">
              {OBJECTIVE}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Vertical timeline from 1986 to today. */
export function MilestonesTimeline() {
  return (
    <section className="section-pad">
      <div className="container-app">
        <SectionHeading
          eyebrow="Our journey"
          title="From one paediatric clinic to 200 beds"
          description="Nearly four decades of building specialist capability inside the district, rather than asking families to travel for it."
        />

        <ol className="relative ml-1">
          {/* Spine */}
          <span
            className="absolute left-[15px] top-2 h-[calc(100%-1rem)] w-0.5 bg-gradient-to-b from-primary-300 via-primary-200 to-transparent"
            aria-hidden="true"
          />

          {MILESTONES.map((m, i) => (
            <li key={m.year} className="relative flex gap-5 pb-8 last:pb-0">
              <span
                className={`relative z-10 mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold ring-4 ring-slate-50 ${
                  i === MILESTONES.length - 1 ? 'bg-mint-500 text-white' : 'bg-primary-600 text-white'
                }`}
              >
                {i + 1}
              </span>

              <div className="card min-w-0 flex-1 p-5">
                <span
                  className={`badge ${
                    i === MILESTONES.length - 1 ? 'bg-mint-100 text-mint-700' : 'bg-primary-100 text-primary-700'
                  }`}
                >
                  {m.year}
                </span>
                <h3 className="mt-2.5 text-[15px] font-bold leading-snug text-slate-900 sm:text-base">{m.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600">{m.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Community and free-care work. */
export function PhilanthropySection() {
  return (
    <section id="philanthropy" className="section-pad bg-white">
      <div className="container-app">
        <SectionHeading
          eyebrow="Philanthropy"
          title="Reaching the unreached"
          description="Free care and outreach that has run alongside the hospital since its earliest years."
        />

        <div className="grid gap-3.5 sm:grid-cols-2">
          {PHILANTHROPY.map((item) => {
            const Icon = resolveIcon(item.icon);
            return (
              <article
                key={item.id}
                className="card group relative overflow-hidden p-5 transition-all duration-300 ease-spring hover:-translate-y-1 hover:shadow-card-hover"
              >
                {/* Oversized index number as a watermark */}
                <span
                  className="pointer-events-none absolute -right-2 -top-5 font-display text-[5.5rem] font-bold leading-none text-slate-100 transition-colors duration-300 group-hover:text-mint-50"
                  aria-hidden="true"
                >
                  {item.index}
                </span>

                <div className="relative">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint-100 text-mint-700">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>

                  <h3 className="mt-4 text-[15px] font-bold leading-snug text-slate-900">{item.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600">{item.body}</p>

                  <span className="mt-4 inline-flex items-center rounded-full bg-mint-50 px-3 py-1 text-[12px] font-bold text-mint-700">
                    {item.stat}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Banner treatment per person, so the two cards are visually distinguishable. */
const LEADER_ACCENTS = {
  primary: {
    band: 'from-primary-700 via-primary-800 to-primary-950',
    chip: 'bg-primary-50 text-primary-700',
    tick: 'text-primary-600',
  },
  mint: {
    band: 'from-mint-600 via-mint-700 to-primary-900',
    chip: 'bg-mint-50 text-mint-700',
    tick: 'text-mint-600',
  },
};

/**
 * One founder card.
 *
 * The portrait overlaps a gradient band rather than sitting in a fixed column
 * beside the text. The earlier side-by-side layout forced a tall crop of a
 * brochure headshot and left the two cards ragged whenever the bios differed in
 * length; an overlapping avatar keeps the card height driven by the text and
 * reads the same at every width.
 */
function LeaderCard({ person }) {
  const dispatch = useDispatch();
  const doctors = useSelector(selectDoctors);
  const accent = LEADER_ACCENTS[person.accent] || LEADER_ACCENTS.primary;

  // Their live consultant record, so the OPD window and the booking button come
  // from the same data the directory uses instead of being restated here.
  const doctor = doctors.find((d) => d.id === person.doctorId);
  const bookable = Boolean(doctor?.available && doctor.opdDays?.length);

  return (
    <article className="card group flex flex-col overflow-hidden p-0 transition-shadow duration-300 hover:shadow-card-hover">
      {/* Gradient band */}
      <div className={`relative h-24 bg-gradient-to-br ${accent.band} sm:h-28`}>
        <span
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(circle at 78% 18%, rgba(255,255,255,0.22) 0%, transparent 42%)',
          }}
          aria-hidden="true"
        />
        <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
          {person.eyebrow}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {/* Portrait, lifted over the band */}
        <div className="-mt-[4.5rem] mb-4 sm:-mt-20">
          <SmartImage
            src={photo(MEDIA[person.photoKey], 320, 320, 'fill', 't')}
            alt={person.name}
            className="h-[6.5rem] w-[6.5rem] rounded-2xl ring-4 ring-white sm:h-28 sm:w-28"
            imgClassName="object-cover object-top"
          />
        </div>

        <h3 className="font-display text-[17px] font-bold leading-snug text-slate-900 sm:text-[19px]">
          {person.name}
        </h3>
        <p className="mt-1 text-[13.5px] font-semibold leading-snug text-slate-700">{person.role}</p>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${accent.chip}`}>
            <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
            {person.qualification}
          </span>
          {/* Only shown when the consultant record actually carries a window. */}
          {bookable && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] font-semibold text-slate-600">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              OPD {formatOpdWindow(doctor)}
            </span>
          )}
        </div>

        <div className="mt-4 space-y-2.5">
          {person.bio.map((para) => (
            <p key={para.slice(0, 28)} className="text-[13.5px] leading-relaxed text-slate-600">
              {para}
            </p>
          ))}
        </div>

        {/* Highlights read as a list rather than chips — these are sentences,
            and chips truncated them into fragments. */}
        <ul className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3.5">
          {person.highlights.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-[12.5px] leading-snug text-slate-700">
              <BadgeCheck className={`mt-px h-4 w-4 shrink-0 ${accent.tick}`} aria-hidden="true" />
              <span className="font-medium">{item}</span>
            </li>
          ))}
        </ul>

        {/* `mt-auto` keeps the buttons aligned across cards of unequal height. */}
        {bookable && (
          <div className="mt-auto flex flex-wrap gap-2 pt-5">
            <button
              type="button"
              onClick={() => dispatch(openBooking({ doctorId: doctor.id }))}
              className="btn-primary btn-sm"
            >
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              Book with {person.shortName}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

/** The hospital's founders, with their brochure portraits. */
export function LeadershipSection() {
  return (
    /* Left on the page's slate background: the cards are white, and AboutSection
       immediately below is bg-white, so a white band here would flatten both. */
    <section id="leadership" className="section-pad">
      <div className="container-app">
        <SectionHeading
          eyebrow="Leadership"
          title="The people who built this hospital"
          description="Two clinicians whose decisions shaped specialist care in Bagalkot — from a single paediatric clinic in 1986 to a 200-bed multi-speciality campus."
        />

        <div className="grid gap-5 lg:grid-cols-2">
          {LEADERSHIP.map((person) => (
            <LeaderCard key={person.id} person={person} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Testimonials — the hospital's published visitor quotes, plus approved
 * patient submissions. Patient entries are only ever loaded from a view that
 * filters to `status = 'approved'`, so nothing unmoderated can appear here.
 */
export function TestimonialsSection() {
  const dispatch = useDispatch();
  const approved = useSelector(selectApprovedTestimonials);
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    dispatch(loadApprovedTestimonials());
  }, [dispatch]);

  // Patient submissions lead: they are the most current and the most relatable.
  const cards = [
    ...approved.map((t) => ({
      id: t.id,
      quote: t.quote,
      name: t.authorName,
      role: t.authorRole || 'Patient',
      photo: t.photo,
      rating: t.rating,
      fromPatient: true,
    })),
    ...TESTIMONIALS.map((t) => ({ ...t, fromPatient: false })),
  ];

  return (
    <section className="section-pad">
      <div className="container-app">
        <SectionHeading
          eyebrow="Testimonials"
          title="What patients and visitors say"
          description="Patient experiences shared with us, alongside notes recorded in the hospital's visitors' book by clinicians, officials and public figures."
          action={
            <button type="button" onClick={() => setWriting(true)} className="btn-primary btn-sm">
              <PenLine className="h-4 w-4" aria-hidden="true" />
              Share your experience
            </button>
          }
        />
      </div>

      <div className="snap-rail px-4 pb-3 sm:px-6 lg:mx-auto lg:max-w-6xl lg:px-8">
        {cards.map((t) => (
          <figure key={t.id} className="card flex w-[19rem] shrink-0 snap-start flex-col p-5 sm:w-[22rem]">
            <div className="flex items-start justify-between gap-2">
              <Quote className="h-6 w-6 shrink-0 text-primary-300" aria-hidden="true" />
              {t.fromPatient && Boolean(t.rating) && (
                <span className="inline-flex shrink-0 items-center gap-0.5" aria-label={`${t.rating} out of 5`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i < t.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                      aria-hidden="true"
                    />
                  ))}
                </span>
              )}
            </div>

            <blockquote className="mt-3 flex-1 text-[14px] font-medium leading-relaxed text-slate-700">
              {t.quote}
            </blockquote>

            <figcaption className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3">
              {t.fromPatient && (
                <SmartImage
                  src={t.photo || initialsAvatar(t.name)}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full"
                  fallback={<img src={initialsAvatar(t.name)} alt="" className="h-full w-full object-cover" />}
                />
              )}
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-bold text-slate-900">{t.name}</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-slate-500">{t.role}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>

      {writing && <TestimonialForm open onClose={() => setWriting(false)} />}
    </section>
  );
}
