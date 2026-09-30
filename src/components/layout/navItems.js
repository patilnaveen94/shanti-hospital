import {
  CalendarPlus,
  Grid3x3,
  Home,
  Info,
  LayoutGrid,
  Megaphone,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';

/**
 * Single source of truth for navigation.
 *
 * `primary` items form the desktop header bar. The mobile bottom bar shows four
 * of them plus a raised Book action and a "More" button that opens the drawer,
 * which lists everything — that keeps the bottom bar at five comfortable touch
 * targets while the information architecture grows.
 */
export const PAGES = [
  { id: 'home', label: 'Home', shortLabel: 'Home', icon: Home, primary: true, inBottomBar: true },
  { id: 'about', label: 'About Us', shortLabel: 'About', icon: Info, primary: true },
  { id: 'departments', label: 'Departments', shortLabel: 'Depts', icon: LayoutGrid, primary: true },
  { id: 'doctors', label: 'Doctors', shortLabel: 'Doctors', icon: Stethoscope, primary: true, inBottomBar: true },
  { id: 'announcements', label: 'Notices', shortLabel: 'Notices', icon: Megaphone, primary: true, inBottomBar: true },
  { id: 'admin', label: 'Admin', shortLabel: 'Admin', icon: ShieldCheck },
];

/** The booking action, surfaced as a button rather than a tab. */
export const BOOK_ACTION = { id: 'book', label: 'Book Appointment', shortLabel: 'Book', icon: CalendarPlus };

/** The drawer trigger used in the mobile bottom bar. */
export const MORE_ACTION = { id: 'more', label: 'More', shortLabel: 'More', icon: Grid3x3 };

export const PRIMARY_NAV = PAGES.filter((p) => p.primary);
export const BOTTOM_NAV = PAGES.filter((p) => p.inBottomBar);
export const PAGE_IDS = PAGES.map((p) => p.id);
