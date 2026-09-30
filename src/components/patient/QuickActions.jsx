import { useDispatch, useSelector } from 'react-redux';
import { Ambulance, CalendarPlus, Megaphone, Navigation, Stethoscope } from 'lucide-react';

import { HOSPITAL } from '../../config/hospital';
import { selectDoctors } from '../../store/doctorsSlice';
import { selectLiveAnnouncements } from '../../store/announcementsSlice';
import { openBooking, setActiveTab } from '../../store/uiSlice';

/**
 * "What do you need?" row, placed immediately under the hero.
 *
 * These are the five things a patient actually opens the site for. Rendered as
 * a 2-col grid on phones so every target is a large, thumb-friendly tile, and a
 * single row from `sm` up.
 */
export default function QuickActions() {
  const dispatch = useDispatch();
  // Derived, not hardcoded — these counts change as admins edit the directory.
  const doctorCount = useSelector(selectDoctors).length;
  const noticeCount = useSelector(selectLiveAnnouncements).length;

  const actions = [
    {
      id: 'book',
      label: 'Book appointment',
      hint: 'Pick a doctor & slot',
      icon: CalendarPlus,
      tone: 'bg-primary-600 text-white',
      hover: 'hover:bg-primary-700',
      onClick: () => dispatch(openBooking({})),
    },
    {
      id: 'doctors',
      label: 'Find a doctor',
      hint: `${doctorCount} consultants`,
      icon: Stethoscope,
      tone: 'bg-white text-slate-800',
      hover: 'hover:border-primary-300 hover:bg-primary-50',
      onClick: () => dispatch(setActiveTab('doctors')),
    },
    {
      id: 'emergency',
      label: 'Emergency',
      hint: `Call ${HOSPITAL.emergency}`,
      icon: Ambulance,
      tone: 'bg-white text-slate-800',
      hover: 'hover:border-danger-300 hover:bg-danger-50',
      href: `tel:${HOSPITAL.emergency.replace(/\s/g, '')}`,
    },
    {
      id: 'notices',
      label: 'Notices',
      hint: noticeCount ? `${noticeCount} active` : 'Camps & timings',
      icon: Megaphone,
      tone: 'bg-white text-slate-800',
      hover: 'hover:border-mint-300 hover:bg-mint-50',
      onClick: () => dispatch(setActiveTab('announcements')),
    },
    {
      id: 'directions',
      label: 'Directions',
      hint: HOSPITAL.addressShort,
      icon: Navigation,
      tone: 'bg-white text-slate-800',
      hover: 'hover:border-primary-300 hover:bg-primary-50',
      href: HOSPITAL.mapsUrl,
      external: true,
    },
  ];

  return (
    // No negative margin: this sits directly below the notice strip, and pulling
    // it upward made the tiles overlap the notice text.
    <section className="bg-slate-50 pb-2 pt-5 sm:pt-6">
      <div className="container-app">
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-5 sm:gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            const isPrimary = action.id === 'book';

            const inner = (
              <>
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-transform duration-300 ease-spring group-hover:scale-110 ${
                    isPrimary ? 'bg-white/20 text-white' : 'bg-slate-100 text-primary-700'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <span className="mt-2 block text-[13px] font-bold leading-tight">{action.label}</span>
                <span
                  className={`mt-0.5 block truncate text-[11px] font-medium ${
                    isPrimary ? 'text-primary-100' : 'text-slate-500'
                  }`}
                >
                  {action.hint}
                </span>
              </>
            );

            // Grid placement lives on the <li>; this class set styles the tile only.
            const shared = `group flex h-full w-full flex-col rounded-2xl border px-3.5 py-3 text-left shadow-card
                            transition-all duration-300 ease-spring hover:-translate-y-1 hover:shadow-card-hover
                            active:translate-y-0 active:scale-[.98]
                            ${isPrimary ? 'border-primary-600' : 'border-slate-200'} ${action.tone} ${action.hover}`;

            return (
              <li key={action.id} className={action.id === 'directions' ? 'col-span-2 sm:col-span-1' : ''}>
                {action.href ? (
                  <a
                    href={action.href}
                    {...(action.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                    className={shared}
                  >
                    {inner}
                  </a>
                ) : (
                  <button type="button" onClick={action.onClick} className={shared}>
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
