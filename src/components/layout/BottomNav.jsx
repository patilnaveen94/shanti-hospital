import { useDispatch, useSelector } from 'react-redux';

import { BOOK_ACTION, BOTTOM_NAV, MORE_ACTION } from './navItems';
import { openBooking, selectActiveTab, selectMenuOpen, setActiveTab, setMenuOpen } from '../../store/uiSlice';
import { selectLiveAnnouncements } from '../../store/announcementsSlice';

/**
 * Sticky bottom tab bar (mobile only).
 *
 * Four destinations plus a raised Book action in the centre, because booking is
 * the primary job a patient comes here to do. The fifth slot is a "More" button
 * that opens the drawer, so About / Departments / Admin stay reachable without
 * cramming six targets into the bar.
 */
export default function BottomNav() {
  const dispatch = useDispatch();
  const activeTab = useSelector(selectActiveTab);
  const menuOpen = useSelector(selectMenuOpen);
  const noticeCount = useSelector(selectLiveAnnouncements).length;

  const BookIcon = BOOK_ACTION.icon;
  const MoreIcon = MORE_ACTION.icon;

  // Render order: two tabs, the raised Book action, one tab, then More.
  const left = BOTTOM_NAV.slice(0, 2);
  const right = BOTTOM_NAV.slice(2);

  const Tab = ({ item }) => {
    const Icon = item.icon;
    const active = activeTab === item.id && !menuOpen;
    return (
      <li className="flex justify-center">
        <button
          type="button"
          onClick={() => dispatch(setActiveTab(item.id))}
          aria-current={active ? 'page' : undefined}
          className={`relative flex h-full min-h-[56px] w-full flex-col items-center justify-center gap-1 rounded-xl transition-colors duration-200 ${
            active ? 'text-primary-700' : 'text-slate-500'
          }`}
        >
          <span className="relative">
            <Icon
              className={`h-[1.3rem] w-[1.3rem] transition-transform duration-200 ${active ? 'scale-110' : ''}`}
              aria-hidden="true"
            />
            {item.id === 'announcements' && noticeCount > 0 && (
              <span
                className="absolute -right-2 -top-1.5 grid h-4 min-w-[1rem] place-items-center rounded-full bg-danger-600 px-1 text-[10px] font-bold leading-none text-white"
                aria-label={`${noticeCount} active announcements`}
              >
                {noticeCount}
              </span>
            )}
          </span>
          <span className="text-[10.5px] font-semibold leading-none">{item.shortLabel}</span>
          {active && <span className="absolute top-0 h-0.5 w-7 rounded-full bg-primary-600" aria-hidden="true" />}
        </button>
      </li>
    );
  };

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 shadow-nav backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="mx-auto grid h-[4.5rem] max-w-lg grid-cols-5 items-center px-1">
        {left.map((item) => (
          <Tab key={item.id} item={item} />
        ))}

        <li className="flex justify-center">
          <button
            type="button"
            onClick={() => dispatch(openBooking({}))}
            aria-label={BOOK_ACTION.label}
            className="-mt-7 flex h-[3.85rem] w-[3.85rem] flex-col items-center justify-center gap-0.5 rounded-2xl
                       bg-primary-600 text-white shadow-lg shadow-primary-600/30 ring-4 ring-white
                       transition-transform duration-200 ease-spring active:scale-95"
          >
            <BookIcon className="h-[1.35rem] w-[1.35rem]" aria-hidden="true" />
            <span className="text-[10px] font-bold leading-none">{BOOK_ACTION.shortLabel}</span>
          </button>
        </li>

        {right.map((item) => (
          <Tab key={item.id} item={item} />
        ))}

        <li className="flex justify-center">
          <button
            type="button"
            onClick={() => dispatch(setMenuOpen(true))}
            aria-label="Open menu"
            className={`relative flex h-full min-h-[56px] w-full flex-col items-center justify-center gap-1 rounded-xl transition-colors duration-200 ${
              menuOpen ? 'text-primary-700' : 'text-slate-500'
            }`}
          >
            <MoreIcon className="h-[1.3rem] w-[1.3rem]" aria-hidden="true" />
            <span className="text-[10.5px] font-semibold leading-none">{MORE_ACTION.shortLabel}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
