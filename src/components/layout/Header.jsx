import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  CalendarPlus,
  ChevronRight,
  Clock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Phone,
  ShieldCheck,
  X,
} from 'lucide-react';

import { HOSPITAL, MEDIA, photo } from '../../config/hospital';
import { BOOK_ACTION, PAGES, PRIMARY_NAV } from './navItems';
import { selectDepartments } from '../../store/departmentsSlice';
import {
  browseDepartment,
  openBooking,
  selectActiveTab,
  selectIsAdmin,
  selectMenuOpen,
  setActiveTab,
  setMenuOpen,
  signOutAdmin,
} from '../../store/uiSlice';

/** Slim always-on emergency strip — the fastest route to a phone call. */
function EmergencyBar() {
  return (
    <div className="bg-danger-700 text-white">
      <div className="container-app flex items-center justify-between gap-3 py-1.5">
        <p className="flex min-w-0 items-center gap-2 text-[12px] font-semibold sm:text-[13px]">
          <span className="relative grid h-4 w-4 shrink-0 place-items-center" aria-hidden="true">
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-white/70" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          <span className="truncate">24×7 Emergency &amp; Trauma Care</span>
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <a
            href={`tel:${HOSPITAL.emergency.replace(/\s/g, '')}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[12px] font-bold transition-colors hover:bg-white/25 sm:text-[13px]"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            {HOSPITAL.emergency}
          </a>
          <a
            href={`tel:${HOSPITAL.ambulance}`}
            className="hidden items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[13px] font-bold transition-colors hover:bg-white/25 sm:inline-flex"
          >
            Ambulance {HOSPITAL.ambulance}
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Header() {
  const dispatch = useDispatch();
  const activeTab = useSelector(selectActiveTab);
  const isAdmin = useSelector(selectIsAdmin);
  const menuOpen = useSelector(selectMenuOpen);
  const departments = useSelector(selectDepartments);
  const [elevated, setElevated] = useState(false);

  useEffect(() => {
    const onScroll = () => setElevated(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock background scroll while the drawer is open.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [menuOpen]);

  // Close the drawer on Escape.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') dispatch(setMenuOpen(false));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen, dispatch]);

  const go = (tab) => dispatch(setActiveTab(tab));
  const featuredDepartments = departments.slice(0, 6);

  return (
    <header className="sticky top-0 z-50">
      <EmergencyBar />

      <div
        className={`border-b bg-white/85 backdrop-blur-xl transition-shadow duration-300 ${
          elevated ? 'border-slate-200 shadow-card' : 'border-slate-100'
        }`}
      >
        <div className="container-app flex h-[4.25rem] items-center gap-4">
          {/* Brand */}
          <button
            type="button"
            onClick={() => go('home')}
            className="flex min-w-0 items-center gap-2.5 rounded-xl py-1 pr-1 text-left transition-opacity hover:opacity-80"
            aria-label={`${HOSPITAL.name} home`}
          >
            <img
              src={photo(MEDIA.logo, 220, 112, 'fit')}
              alt=""
              width="220"
              height="112"
              className="h-9 w-auto shrink-0 sm:h-10"
            />
            <span className="min-w-0 border-l border-slate-200 pl-2.5">
              <span className="block truncate font-display text-[15px] font-bold leading-tight text-slate-900 sm:text-base">
                {HOSPITAL.name}
              </span>
              <span className="block truncate text-[11px] font-medium text-slate-500">
                {HOSPITAL.city} · Since {HOSPITAL.established}
              </span>
            </span>
          </button>

          {/* Desktop nav — segmented pill group */}
          <nav className="mx-auto hidden lg:block" aria-label="Main navigation">
            <ul className="flex items-center gap-1 rounded-full bg-slate-100/80 p-1">
              {PRIMARY_NAV.map((item) => {
                const active = activeTab === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => go(item.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`rounded-full px-4 py-2 text-[13.5px] font-semibold transition-all duration-200 ${
                        active
                          ? 'bg-white text-primary-700 shadow-sm'
                          : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                      }`}
                    >
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            {/*
              Staff entry point. This must render whether or not someone is
              signed in: the drawer that used to carry the Admin link is
              `lg:hidden`, so gating this on `isAdmin` left desktop users with no
              route to the sign-in screen at all.
            */}
            <button
              type="button"
              onClick={() => go('admin')}
              aria-current={activeTab === 'admin' ? 'page' : undefined}
              title={isAdmin ? 'Admin dashboard' : 'Hospital staff sign in'}
              className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors sm:inline-flex ${
                isAdmin
                  ? 'bg-mint-50 text-mint-700 hover:bg-mint-100'
                  : activeTab === 'admin'
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {isAdmin ? 'Admin' : 'Staff'}
            </button>

            <button
              type="button"
              onClick={() => dispatch(openBooking({}))}
              className="btn-primary btn-sm hidden sm:inline-flex"
            >
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:inline">Book Appointment</span>
              <span className="md:hidden">Book</span>
            </button>

            <button
              type="button"
              onClick={() => dispatch(setMenuOpen(true))}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50 lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Drawer ---------- */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="presentation">
          <div
            className="absolute inset-0 animate-fade-in bg-slate-900/60 backdrop-blur-sm"
            onClick={() => dispatch(setMenuOpen(false))}
            aria-hidden="true"
          />

          <div
            className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm animate-slide-in-right flex-col bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <img src={photo(MEDIA.logo, 180, 92, 'fit')} alt="" className="h-8 w-auto" />
                <span className="min-w-0">
                  <span className="block truncate font-display text-[14px] font-bold text-slate-900">
                    {HOSPITAL.name}
                  </span>
                  <span className="block text-[11px] text-slate-500">{HOSPITAL.city}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => dispatch(setMenuOpen(false))}
                aria-label="Close menu"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              {/* Primary CTA */}
              <div className="p-4 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    dispatch(setMenuOpen(false));
                    dispatch(openBooking({}));
                  }}
                  className="btn-primary w-full"
                >
                  <CalendarPlus className="h-4.5 w-4.5" aria-hidden="true" />
                  {BOOK_ACTION.label}
                </button>
              </div>

              {/* Pages */}
              <nav className="px-2 pb-2" aria-label="Mobile navigation">
                <p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Browse</p>
                <ul>
                  {PAGES.map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => go(item.id)}
                          aria-current={active ? 'page' : undefined}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] font-semibold transition-colors ${
                            active ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                              active ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                          </span>
                          {item.label}
                          <ChevronRight className="ml-auto h-4 w-4 text-slate-300" aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              {/* Department shortcuts */}
              <div className="border-t border-slate-100 px-5 py-4">
                <p className="pb-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Popular departments
                </p>
                <div className="flex flex-wrap gap-2">
                  {featuredDepartments.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => dispatch(browseDepartment(d.id))}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-slate-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div className="border-t border-slate-100 px-5 py-4">
                <p className="pb-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Reach us</p>
                <ul className="space-y-2.5 text-[13px]">
                  <li className="flex gap-2.5">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden="true" />
                    <span className="text-slate-600">
                      <strong className="block font-semibold text-slate-800">OPD 9:00 AM – 5:00 PM</strong>
                      Emergency open 24 hours
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden="true" />
                    <a
                      href={HOSPITAL.mapsUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-slate-600 underline-offset-2 hover:text-primary-700 hover:underline"
                    >
                      {HOSPITAL.addressShort}
                    </a>
                  </li>
                  <li className="flex gap-2.5">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden="true" />
                    <a href={`mailto:${HOSPITAL.email}`} className="break-all text-slate-600 hover:text-primary-700">
                      {HOSPITAL.email}
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Drawer footer */}
            <div className="space-y-2 border-t border-slate-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <a href={`tel:${HOSPITAL.emergency.replace(/\s/g, '')}`} className="btn-danger w-full">
                <Phone className="h-4 w-4" aria-hidden="true" />
                Emergency · {HOSPITAL.emergency}
              </a>
              {isAdmin && (
                <button type="button" onClick={() => dispatch(signOutAdmin())} className="btn-secondary w-full">
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out of admin
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
