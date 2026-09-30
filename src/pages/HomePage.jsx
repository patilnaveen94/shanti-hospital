import { useDispatch } from 'react-redux';
import { ArrowRight } from 'lucide-react';

import AboutSection from '../components/patient/AboutSection';
import AnnouncementTicker from '../components/patient/AnnouncementTicker';
import ContactSection from '../components/patient/ContactSection';
import DepartmentExplorer from '../components/patient/DepartmentExplorer';
import DoctorDirectory from '../components/patient/DoctorDirectory';
import FacilityGallery from '../components/patient/FacilityGallery';
import Hero from '../components/patient/Hero';
import NoticeBoard from '../components/patient/NoticeBoard';
import QuickActions from '../components/patient/QuickActions';
import { PhilanthropySection, TestimonialsSection } from '../components/patient/StorySections';
import TrustStrip from '../components/patient/TrustStrip';
import { setActiveTab } from '../store/uiSlice';

/**
 * Home page order follows patient intent, most urgent first:
 * act → what's new → what we treat → who we are → proof → who treats you → visit.
 */
export default function HomePage() {
  const dispatch = useDispatch();

  return (
    <>
      <Hero />
      <AnnouncementTicker />
      <QuickActions />

      <NoticeBoard variant="compact" limit={2} />

      <DepartmentExplorer />
      <div className="container-app -mt-6 pb-10 text-center sm:-mt-8 sm:pb-14">
        <button type="button" onClick={() => dispatch(setActiveTab('departments'))} className="btn-secondary">
          Full department &amp; facilities guide
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <AboutSection />
      <div className="bg-white pb-12 text-center sm:pb-16">
        <div className="container-app">
          <button type="button" onClick={() => dispatch(setActiveTab('about'))} className="btn-secondary">
            Read our full story
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <TrustStrip />
      <PhilanthropySection />
      <FacilityGallery />
      <TestimonialsSection />

      {/* Directory preview — the full, filterable list lives on the Doctors tab */}
      <div className="bg-white">
        <DoctorDirectory limit={4} />
        <div className="container-app -mt-8 pb-12 text-center sm:-mt-10 sm:pb-16">
          <button type="button" onClick={() => dispatch(setActiveTab('doctors'))} className="btn-secondary">
            View all consultants
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <ContactSection />
    </>
  );
}
