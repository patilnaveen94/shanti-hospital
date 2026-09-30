import { useDispatch } from 'react-redux';
import { CalendarPlus, Phone } from 'lucide-react';

import DoctorDirectory from '../components/patient/DoctorDirectory';
import { HOSPITAL } from '../config/hospital';
import { openBooking } from '../store/uiSlice';

export default function DoctorsPage() {
  const dispatch = useDispatch();

  return (
    <>
      {/* Page banner */}
      <section className="border-b border-slate-200 bg-gradient-to-br from-primary-800 to-primary-950">
        <div className="container-app py-9 sm:py-12">
          <h1 className="text-2xl text-white sm:text-4xl">Our consultants</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-primary-100 sm:text-base">
            Specialists across {HOSPITAL.beds}-bed multi-speciality care at {HOSPITAL.city} — search by name,
            speciality or language, then book an OPD slot in under a minute.
          </p>

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            <button type="button" onClick={() => dispatch(openBooking({}))} className="btn-primary w-full sm:w-auto">
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              Book Appointment
            </button>
            <a
              href={`tel:${HOSPITAL.phones[0].replace(/\s/g, '')}`}
              className="btn w-full border border-white/25 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 sm:w-auto"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              Call reception
            </a>
          </div>
        </div>
      </section>

      <div className="bg-white">
        <DoctorDirectory heading={false} />
      </div>
    </>
  );
}
