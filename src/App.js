import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2, TriangleAlert } from 'lucide-react';

import BookingModal from './components/booking/BookingModal';
import Toaster from './components/common/Toaster';
import BottomNav from './components/layout/BottomNav';
import Footer from './components/layout/Footer';
import Header from './components/layout/Header';

import AboutPage from './pages/AboutPage';
import AdminPage from './pages/AdminPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import DepartmentsPage from './pages/DepartmentsPage';
import DoctorsPage from './pages/DoctorsPage';
import HomePage from './pages/HomePage';

import { selectActiveTab } from './store/uiSlice';
import {
  bootstrap,
  selectBackendError,
  selectBackendStatus,
  selectIsCloud,
} from './store/backendSlice';

const PAGES = {
  home: HomePage,
  about: AboutPage,
  departments: DepartmentsPage,
  doctors: DoctorsPage,
  announcements: AnnouncementsPage,
  admin: AdminPage,
};

/** Full-page state shown only while the first cloud fetch is in flight. */
function Splash({ error, onRetry }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <div className="max-w-sm text-center">
        {error ? (
          <>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-danger-50 text-danger-600">
              <TriangleAlert className="h-7 w-7" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-xl">Could not load hospital data</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{error}</p>
            <button type="button" onClick={onRetry} className="btn-primary mt-5">
              Try again
            </button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
            <p className="mt-4 text-[14px] font-medium text-slate-500">Loading…</p>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * App shell.
 *
 * Navigation is tab-based rather than URL-routed. In cloud mode the reference
 * data is fetched once on mount before the site renders; in local mode the
 * seeded store is already populated and this is a no-op.
 */
export default function App() {
  const dispatch = useDispatch();
  const activeTab = useSelector(selectActiveTab);
  const isCloud = useSelector(selectIsCloud);
  const status = useSelector(selectBackendStatus);
  const error = useSelector(selectBackendError);

  useEffect(() => {
    if (isCloud) dispatch(bootstrap());
  }, [dispatch, isCloud]);

  // Reset scroll on tab change so each screen opens at the top.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeTab]);

  const Page = PAGES[activeTab] || HomePage;
  const blocked = isCloud && status !== 'ready';

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg
                   focus:bg-primary-700 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        Skip to main content
      </a>

      <Header />

      <main id="main" className="flex-1">
        {blocked ? (
          <Splash error={status === 'error' ? error : ''} onRetry={() => dispatch(bootstrap())} />
        ) : (
          <div key={activeTab} className="animate-fade-in">
            <Page />
          </div>
        )}
      </main>

      {/* pb-nav keeps the sticky bottom bar from covering the last footer row */}
      <div className="pb-nav">
        <Footer />
      </div>

      <BottomNav />
      <BookingModal />
      <Toaster />
    </div>
  );
}
