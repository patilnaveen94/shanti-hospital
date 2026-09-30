import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  BellOff,
  CalendarClock,
  HeartHandshake,
  Megaphone,
  Pin,
  TriangleAlert,
} from 'lucide-react';

import { photo } from '../../config/hospital';
import { EmptyState, SectionHeading, SmartImage } from '../common/Bits';
import { announcementMeta, selectLiveAnnouncements } from '../../store/announcementsSlice';
import { relativeTime } from '../../utils/format';

const ICONS = { Megaphone, HeartHandshake, TriangleAlert, CalendarClock };

function AnnouncementCard({ item, featured }) {
  const meta = announcementMeta(item.type);
  const Icon = ICONS[meta.icon] || Megaphone;

  return (
    <article className={`card overflow-hidden ${featured ? 'sm:col-span-2' : ''}`}>
      {Boolean(item.image) && (
        <SmartImage
          src={photo(item.image, featured ? 1200 : 700, featured ? 675 : 394)}
          alt=""
          className={`w-full ${featured ? 'aspect-[16/9]' : 'aspect-[16/9]'}`}
        />
      )}

      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${meta.badge}`}>
            <Icon className="h-3 w-3" aria-hidden="true" />
            {meta.label}
          </span>
          {item.pinned && (
            <span className="badge bg-slate-100 text-slate-600">
              <Pin className="h-3 w-3" aria-hidden="true" />
              Pinned
            </span>
          )}
          <span className="ml-auto text-[11.5px] font-medium text-slate-400">{relativeTime(item.createdAt)}</span>
        </div>

        <h3 className={`mt-3 font-bold leading-snug text-slate-900 ${featured ? 'text-lg sm:text-xl' : 'text-[15px]'}`}>
          {item.title}
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{item.message}</p>
      </div>
    </article>
  );
}

/**
 * Notice board.
 *
 * On the homepage we render a compact alert-style strip of the top notices;
 * the dedicated Announcements tab renders the full board.
 */
export default function NoticeBoard({ variant = 'full', limit }) {
  const announcements = useSelector(selectLiveAnnouncements);
  const [showAll, setShowAll] = useState(false);

  if (!announcements.length) {
    return (
      <section className="section-pad">
        <div className="container-app">
          {variant === 'full' && <SectionHeading eyebrow="Notice board" title="Announcements" />}
          <EmptyState
            icon={BellOff}
            title="No active announcements"
            description="Health camps, revised OPD timings and emergency notices will appear here as soon as the hospital publishes them."
          />
        </div>
      </section>
    );
  }

  const cap = limit ?? (showAll ? announcements.length : 5);
  const visible = announcements.slice(0, cap);

  return (
    <section id="announcements" className="section-pad">
      <div className="container-app">
        <SectionHeading
          eyebrow="Notice board"
          title={variant === 'full' ? 'Announcements & health camps' : 'Latest from the hospital'}
          description={
            variant === 'full'
              ? 'Published by the hospital administration. Pinned notices stay at the top.'
              : undefined
          }
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((item, index) => (
            <AnnouncementCard key={item.id} item={item} featured={index === 0 && Boolean(item.image)} />
          ))}
        </div>

        {!limit && announcements.length > 5 && (
          <div className="mt-6 flex justify-center">
            <button type="button" onClick={() => setShowAll((s) => !s)} className="btn-secondary">
              {showAll ? 'Show fewer' : `Show all ${announcements.length} notices`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
