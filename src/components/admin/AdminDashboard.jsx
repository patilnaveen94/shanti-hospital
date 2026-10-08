import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  CalendarCheck2,
  CalendarClock,
  CalendarOff,
  CircleCheck,
  Cloud,
  Database,
  FolderHeart,
  HardDrive,
  Layers,
  LogOut,
  Megaphone,
  MessageSquareQuote,
  RotateCcw,
  SlidersHorizontal,
  Stethoscope,
  Users,
} from 'lucide-react';

import AnnouncementManager from './AnnouncementManager';
import AppointmentTracker from './AppointmentTracker';
import AvailabilityManager from './AvailabilityManager';
import DepartmentManager from './DepartmentManager';
import DoctorManager from './DoctorManager';
import PatientRecords from './PatientRecords';
import SettingsManager from './SettingsManager';
import TestimonialManager from './TestimonialManager';
import ConfirmDialog from '../common/ConfirmDialog';
import { StatTile } from '../common/Bits';

import { HOSPITAL } from '../../config/hospital';
import { resetAnnouncements, selectLiveAnnouncements } from '../../store/announcementsSlice';
import { resetAppointments, selectAppointmentStats } from '../../store/appointmentsSlice';
import { resetDepartments, selectDepartments } from '../../store/departmentsSlice';
import { resetDoctors, selectDoctors } from '../../store/doctorsSlice';
import {
  bootstrap,
  seedBackend,
  selectIsCloud,
  selectIsSeeding,
  selectStaffSession,
  staffSignOut,
} from '../../store/backendSlice';
import { resetRecords } from '../../store/recordsSlice';
import { resetSettings } from '../../store/settingsSlice';
import {
  loadAllTestimonials,
  resetTestimonials,
  selectTestimonialCounts,
} from '../../store/testimonialsSlice';
import { resetUnavailability } from '../../store/unavailabilitySlice';
import { pushToast, signOutAdmin } from '../../store/uiSlice';

const TABS = [
  { id: 'appointments', label: 'Appointments', icon: CalendarCheck2 },
  { id: 'records', label: 'Patient records', icon: FolderHeart },
  { id: 'doctors', label: 'Doctors', icon: Stethoscope },
  { id: 'availability', label: 'Availability', icon: CalendarOff },
  { id: 'departments', label: 'Departments', icon: Layers },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'testimonials', label: 'Testimonials', icon: MessageSquareQuote },
  { id: 'settings', label: 'Settings', icon: SlidersHorizontal },
];

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const [tab, setTab] = useState('appointments');
  const [confirmReset, setConfirmReset] = useState(false);

  const stats = useSelector(selectAppointmentStats);
  const doctors = useSelector(selectDoctors);
  const departments = useSelector(selectDepartments);
  const liveNotices = useSelector(selectLiveAnnouncements);
  const isCloud = useSelector(selectIsCloud);
  const session = useSelector(selectStaffSession);
  const seeding = useSelector(selectIsSeeding);
  const testimonialCounts = useSelector(selectTestimonialCounts);

  /**
   * The moderation queue is loaded here rather than inside TestimonialManager
   * because the tab strip shows the pending count before that tab is ever
   * opened. Inert in local mode, where the queue is already in the store.
   */
  useEffect(() => {
    dispatch(loadAllTestimonials());
  }, [dispatch]);

  /**
   * Local mode only: restore the bundled demo dataset.
   * Every persisted slice has to be listed here — anything omitted survives the
   * "reset" and leaves the demo in a state the seed never produced.
   */
  const resetAll = () => {
    dispatch(resetAppointments());
    dispatch(resetDoctors());
    dispatch(resetDepartments());
    dispatch(resetAnnouncements());
    dispatch(resetUnavailability());
    dispatch(resetSettings());
    dispatch(resetTestimonials());
    dispatch(resetRecords());
    dispatch(pushToast('Demo data restored to its original state', 'info'));
  };

  const signOut = async () => {
    if (isCloud) await dispatch(staffSignOut());
    dispatch(signOutAdmin());
  };

  /** Cloud mode: one-time push of bundled data into an empty database. */
  const runSeed = async () => {
    const result = await dispatch(seedBackend());
    if (result.meta.requestStatus === 'fulfilled') {
      const { departments: d, doctors: dr, announcements: a } = result.payload;
      dispatch(pushToast(`Seeded ${d} departments, ${dr} doctors, ${a} notices`, 'success'));
      dispatch(bootstrap());
    } else {
      dispatch(pushToast(result.payload || 'Seeding failed.', 'error'));
    }
  };

  return (
    <section className="section-pad">
      <div className="container-app">
        {/* Header */}
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge bg-mint-100 text-mint-700">
                <CircleCheck className="h-3 w-3" aria-hidden="true" />
                Signed in
              </span>
              {/* Make the storage mode unmistakable — it changes what a change means. */}
              <span className={`badge ${isCloud ? 'bg-primary-100 text-primary-700' : 'bg-amber-100 text-amber-800'}`}>
                {isCloud ? <Cloud className="h-3 w-3" aria-hidden="true" /> : <HardDrive className="h-3 w-3" aria-hidden="true" />}
                {isCloud ? 'Cloud database' : 'This browser only'}
              </span>
              {session?.role && (
                <span className="badge bg-slate-100 text-slate-600">{session.role.replace('_', ' ')}</span>
              )}
            </div>

            <h1 className="mt-2 text-2xl sm:text-3xl">Management dashboard</h1>
            <p className="mt-1 text-[14.5px] text-slate-600">
              {HOSPITAL.name}, {HOSPITAL.city} —{' '}
              {isCloud
                ? `changes save to the hospital database${session?.email ? ` · ${session.email}` : ''}.`
                : 'changes save to this browser only.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isCloud ? (
              <button type="button" onClick={runSeed} disabled={seeding} className="btn-secondary btn-sm">
                <Database className="h-4 w-4" aria-hidden="true" />
                {seeding ? 'Seeding…' : 'Seed database'}
              </button>
            ) : (
              <button type="button" onClick={() => setConfirmReset(true)} className="btn-secondary btn-sm">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reset demo data
              </button>
            )}
            <button type="button" onClick={signOut} className="btn-ghost btn-sm">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </header>

        {!isCloud && (
          <p className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[12.5px] leading-relaxed text-amber-900">
            <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
            <span>
              No backend is connected, so everything you change here lives only in this browser and is invisible to
              other devices. See <code className="font-mono font-bold">README-backend.md</code> to connect the hospital
              database.
            </span>
          </p>
        )}

        {/* At-a-glance */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile icon={CalendarClock} value={stats.pending} label="Awaiting confirmation" tone="bg-amber-50 text-amber-700" />
          <StatTile icon={CalendarCheck2} value={stats.today} label="Scheduled today" tone="bg-primary-50 text-primary-700" />
          <StatTile icon={Users} value={doctors.filter((d) => d.available).length} label={`Doctors on duty / ${doctors.length}`} tone="bg-mint-50 text-mint-700" />
          <StatTile icon={Megaphone} value={liveNotices.length} label={`Live notices · ${departments.length} depts`} tone="bg-violet-50 text-violet-700" />
        </div>

        {/* Section tabs */}
        <div className="-mx-4 mb-6 px-4 sm:mx-0 sm:px-0">
          <div className="snap-rail border-b border-slate-200 pb-0" role="tablist" aria-label="Admin sections">
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              // Only testimonials carry a backlog that needs acting on, and it
              // is invisible from anywhere else in the dashboard.
              const pending = item.id === 'testimonials' ? testimonialCounts.pending : 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(item.id)}
                  className={`relative flex min-h-[46px] shrink-0 snap-start items-center gap-2 px-4 text-[13.5px] font-bold transition-colors ${
                    active ? 'text-primary-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                  {pending > 0 && (
                    <span
                      className="grid min-w-[18px] place-items-center rounded-full bg-amber-500 px-1 py-0.5 text-[10.5px] font-bold leading-none text-white"
                      aria-label={`${pending} awaiting review`}
                    >
                      {pending}
                    </span>
                  )}
                  {active && <span className="absolute inset-x-2 bottom-0 h-[2.5px] rounded-t-full bg-primary-600" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>

        <div key={tab} className="animate-fade-in">
          {tab === 'appointments' && <AppointmentTracker />}
          {tab === 'records' && <PatientRecords />}
          {tab === 'doctors' && <DoctorManager />}
          {tab === 'availability' && <AvailabilityManager />}
          {tab === 'departments' && <DepartmentManager />}
          {tab === 'announcements' && <AnnouncementManager />}
          {tab === 'testimonials' && <TestimonialManager />}
          {tab === 'settings' && <SettingsManager />}
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={resetAll}
        title="Restore the original demo data?"
        message="Every doctor, department, announcement and appointment you added or edited will be replaced with the seeded dataset. This cannot be undone."
        confirmLabel="Reset everything"
      />
    </section>
  );
}
