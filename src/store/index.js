import { configureStore } from '@reduxjs/toolkit';

import announcements from './announcementsSlice';
import appointments from './appointmentsSlice';
import backend from './backendSlice';
import departments from './departmentsSlice';
import doctors from './doctorsSlice';
import notifications from './notificationsSlice';
import records from './recordsSlice';
import settings from './settingsSlice';
import testimonials from './testimonialsSlice';
import ui from './uiSlice';
import unavailability from './unavailabilitySlice';
import { loadState, persistMiddleware } from './persist';
import { isCloudMode } from '../api/client';

export const store = configureStore({
  reducer: {
    departments,
    doctors,
    announcements,
    appointments,
    ui,
    backend,
    notifications,
    records,
    settings,
    testimonials,
    unavailability,
  },
  /**
   * Local mode rehydrates from localStorage. Cloud mode does not: Postgres is
   * the source of truth, and caching patient data in the browser would outlive
   * the staff session.
   */
  preloadedState: isCloudMode ? undefined : loadState(),
  middleware: (getDefault) =>
    isCloudMode ? getDefault() : getDefault().concat(persistMiddleware),
});

export default store;
