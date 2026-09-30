import { useSelector } from 'react-redux';
import { Bell } from 'lucide-react';

import NoticeBoard from '../components/patient/NoticeBoard';
import { HOSPITAL } from '../config/hospital';
import { selectLiveAnnouncements } from '../store/announcementsSlice';

export default function AnnouncementsPage() {
  const count = useSelector(selectLiveAnnouncements).length;

  return (
    <>
      <section className="border-b border-slate-200 bg-gradient-to-br from-primary-800 to-primary-950">
        <div className="container-app py-9 sm:py-12">
          <span className="badge bg-white/15 text-white backdrop-blur-sm">
            <Bell className="h-3 w-3" aria-hidden="true" />
            {count} active {count === 1 ? 'notice' : 'notices'}
          </span>
          <h1 className="mt-2.5 text-2xl text-white sm:text-4xl">Notice board</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-primary-100 sm:text-base">
            Health camps, new services, revised OPD timings and emergency updates from {HOSPITAL.name}, {HOSPITAL.city}.
          </p>
        </div>
      </section>

      <div className="bg-white">
        <NoticeBoard variant="full" />
      </div>
    </>
  );
}
