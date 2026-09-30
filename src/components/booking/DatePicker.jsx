import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

import { toDateKey } from '../../utils/format';

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Monday-first column index for a JS day number (0 = Sunday). */
function mondayIndex(jsDay) {
  return (jsDay + 6) % 7;
}

/**
 * Month-grid date picker.
 *
 * Replaces a horizontally scrolling rail of 21 days. That rail had two problems
 * on a phone: the list ran well past the screen edge so later dates were
 * effectively hidden, and horizontal scrolling inside a vertically scrolling
 * sheet is easy to trigger by accident.
 *
 * A month grid shows roughly five weeks in the same vertical space, needs no
 * horizontal scrolling, and matches what people already expect from a date
 * picker. Unavailable days stay visible but disabled so the doctor's pattern
 * reads at a glance — you can see "Tuesdays and Thursdays" rather than guessing.
 */
export default function DatePicker({ availableDates, value, onChange }) {
  /** `{ 'YYYY-MM-DD': dayMeta }` for O(1) lookup while painting the grid. */
  const byKey = useMemo(() => {
    const map = new Map();
    (availableDates || []).forEach((d) => map.set(d.key, d));
    return map;
  }, [availableDates]);

  const firstAvailable = availableDates?.[0]?.key;

  /** Which month the grid is showing, as a Date pinned to the 1st. */
  const [cursor, setCursor] = useState(() => {
    const anchor = value || firstAvailable || toDateKey(new Date());
    const d = new Date(`${anchor}T00:00:00`);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // If the doctor changes, jump to the month holding their first open date.
  useEffect(() => {
    if (!firstAvailable) return;
    const d = new Date(`${firstAvailable}T00:00:00`);
    setCursor((prev) => {
      const sameMonth = prev.getFullYear() === d.getFullYear() && prev.getMonth() === d.getMonth();
      // Only move if the current view has nothing to offer.
      const hasAny = (availableDates || []).some(
        (x) => x.key.startsWith(`${prev.getFullYear()}-${`${prev.getMonth() + 1}`.padStart(2, '0')}`)
      );
      return sameMonth || hasAny ? prev : new Date(d.getFullYear(), d.getMonth(), 1);
    });
  }, [firstAvailable, availableDates]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  /** Leading blanks + every day of the month. */
  const cells = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const lead = mondayIndex(firstOfMonth.getDay());

    const out = Array.from({ length: lead }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = toDateKey(new Date(year, month, day));
      out.push({ day, key, meta: byKey.get(key) });
    }
    return out;
  }, [year, month, byKey]);

  const countThisMonth = cells.filter((c) => c?.meta).length;

  // Only offer navigation toward months that actually contain open dates.
  const monthKey = (d) => `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}`;
  const monthsWithDates = useMemo(
    () => new Set((availableDates || []).map((d) => d.key.slice(0, 7))),
    [availableDates]
  );

  const prevMonth = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month + 1, 1);
  const canGoPrev = monthsWithDates.has(monthKey(prevMonth));
  const canGoNext = monthsWithDates.has(monthKey(nextMonth));

  const todayKey = toDateKey(new Date());

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
      {/* Month header */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCursor(prevMonth)}
          disabled={!canGoPrev}
          aria-label="Previous month"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors
                     hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="h-4.5 w-4.5" />
        </button>

        <p className="text-center text-[13.5px] font-bold text-slate-900" aria-live="polite">
          {MONTH_NAMES[month]} {year}
          <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
            {countThisMonth} {countThisMonth === 1 ? 'date' : 'dates'} available
          </span>
        </p>

        <button
          type="button"
          onClick={() => setCursor(nextMonth)}
          disabled={!canGoNext}
          aria-label="Next month"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors
                     hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label, i) => (
          <span
            key={`${label}-${i}`}
            aria-hidden="true"
            className="pb-1 text-center text-[10.5px] font-bold uppercase tracking-wide text-slate-400"
          >
            {label}
          </span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          if (!cell) return <span key={`blank-${index}`} aria-hidden="true" />;

          const open = Boolean(cell.meta);
          const selected = value === cell.key;
          const isToday = cell.key === todayKey;

          return (
            <button
              key={cell.key}
              type="button"
              disabled={!open}
              onClick={() => onChange(cell.key)}
              aria-pressed={selected}
              aria-label={
                open
                  ? `${cell.day} ${MONTH_NAMES[month]}${isToday ? ', today' : ''}`
                  : `${cell.day} ${MONTH_NAMES[month]}, not available`
              }
              className={`relative grid aspect-square min-h-[38px] place-items-center rounded-lg text-[13.5px]
                          font-semibold transition-all duration-150 ease-spring
                          ${
                            selected
                              ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25'
                              : open
                                ? 'bg-primary-50 text-primary-800 hover:bg-primary-100 active:scale-95'
                                : 'cursor-not-allowed text-slate-300'
                          }`}
            >
              {cell.day}
              {/* Today marker, shown only when the day is not selected */}
              {isToday && !selected && (
                <span
                  className={`absolute bottom-1 h-1 w-1 rounded-full ${open ? 'bg-primary-600' : 'bg-slate-300'}`}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-2.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
          <span className="h-3 w-3 rounded bg-primary-50 ring-1 ring-inset ring-primary-200" aria-hidden="true" />
          OPD day
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
          <span className="h-3 w-3 rounded bg-primary-600" aria-hidden="true" />
          Selected
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
          <CalendarDays className="h-3 w-3" aria-hidden="true" />
          Greyed dates are unavailable
        </span>
      </div>
    </div>
  );
}
