import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowRight,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  Megaphone,
  Pause,
  Play,
  TriangleAlert,
} from 'lucide-react';

import { announcementMeta, selectLiveAnnouncements } from '../../store/announcementsSlice';
import { setActiveTab } from '../../store/uiSlice';

const ICONS = { Megaphone, HeartHandshake, TriangleAlert, CalendarClock };

const ROTATE_MS = 6500;

/**
 * Homepage notice strip.
 *
 * This replaces a continuous marquee: scrolling text is genuinely hard to read
 * (you cannot fixate on a moving target, and it penalises slower readers and
 * anyone using a screen magnifier). Instead one notice is shown at a time, held
 * for 6.5s, with a progress bar, manual prev/next, a play/pause control and
 * auto-pause on hover or keyboard focus. Rotation is also disabled outright for
 * users who prefer reduced motion.
 */
export default function AnnouncementTicker() {
  const dispatch = useDispatch();
  const announcements = useSelector(selectLiveAnnouncements);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const timer = useRef(null);

  const count = announcements.length;

  const go = useCallback(
    (next) => {
      if (!count) return;
      setIndex(((next % count) + count) % count);
    },
    [count]
  );

  // Respect the OS "reduce motion" setting — no auto-advance at all.
  const reduceMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (count <= 1 || paused || userPaused || reduceMotion) return undefined;
    timer.current = setTimeout(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearTimeout(timer.current);
  }, [index, count, paused, userPaused, reduceMotion]);

  // Keep the index valid if an admin hides or deletes a notice.
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  if (!count) return null;

  const item = announcements[index];
  const meta = announcementMeta(item.type);
  const Icon = ICONS[meta.icon] || Megaphone;
  const running = !paused && !userPaused && !reduceMotion && count > 1;

  return (
    <aside
      aria-label="Hospital announcements"
      className="relative border-y border-primary-800/40 bg-primary-900"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="container-app">
        <div className="flex items-center gap-3 py-3 sm:gap-4">
          {/* Label */}
          <div className="flex shrink-0 items-center gap-2 self-start pt-0.5 text-mint-300 sm:self-center sm:pt-0">
            <Megaphone className="h-4 w-4" aria-hidden="true" />
            <span className="hidden text-[11px] font-bold uppercase tracking-widest sm:inline">Notices</span>
          </div>

          <span className="w-px shrink-0 self-stretch bg-white/15" aria-hidden="true" />

          {/* Rotating notice — a live region so changes are announced once */}
          <div className="min-w-0 flex-1" aria-live="polite" aria-atomic="true">
            <button
              type="button"
              onClick={() => dispatch(setActiveTab('announcements'))}
              className="group flex w-full items-center gap-2.5 text-left"
            >
              <span
                className={`hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:inline-flex ${meta.badge}`}
              >
                <Icon className="h-3 w-3" aria-hidden="true" />
                {meta.label}
              </span>

              {/* key forces the fade to replay on each change.
                  Titles wrap to two lines on phones instead of truncating —
                  a clipped headline is not a readable notice. */}
              <span key={item.id} className="min-w-0 animate-fade-in">
                <span className="line-clamp-2 block text-[12.5px] font-bold leading-snug text-white sm:truncate sm:text-sm">
                  {item.title}
                </span>
                <span className="hidden truncate text-[12px] text-primary-200 sm:block">{item.message}</span>
              </span>

              <ArrowRight
                className="ml-auto hidden h-4 w-4 shrink-0 text-primary-300 transition-transform group-hover:translate-x-0.5 group-hover:text-white lg:block"
                aria-hidden="true"
              />
            </button>
          </div>

          {/* Controls */}
          {count > 1 && (
            <div className="flex shrink-0 items-center gap-0.5 self-center">
              <button
                type="button"
                onClick={() => go(index - 1)}
                aria-label="Previous notice"
                className="grid h-8 w-8 place-items-center rounded-lg text-primary-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-1 text-[11px] font-bold tabular-nums text-primary-300">
                {index + 1}/{count}
              </span>

              <button
                type="button"
                onClick={() => go(index + 1)}
                aria-label="Next notice"
                className="grid h-8 w-8 place-items-center rounded-lg text-primary-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {!reduceMotion && (
                <button
                  type="button"
                  onClick={() => setUserPaused((p) => !p)}
                  aria-label={userPaused ? 'Resume notice rotation' : 'Pause notice rotation'}
                  className="ml-0.5 hidden h-8 w-8 place-items-center rounded-lg text-primary-200 transition-colors hover:bg-white/10 hover:text-white sm:grid"
                >
                  {userPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar — restarts on each slide via the key */}
      {running && (
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10" aria-hidden="true">
          <div
            key={`${item.id}-${index}`}
            className="h-full bg-mint-400"
            style={{ transformOrigin: 'left', animation: `ticker-progress ${ROTATE_MS}ms linear forwards` }}
          />
        </div>
      )}
    </aside>
  );
}
