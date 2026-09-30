import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { BACKEND_MODE, isCloudMode } from '../api/client';
import {
  fetchAppointments,
  fetchPublicData,
  restoreSession,
  seedDatabase,
  signInStaff,
  signOutStaff,
} from '../api/repository';
import { SEED_ANNOUNCEMENTS, SEED_DEPARTMENTS, SEED_DOCTORS } from '../data/seed';

/**
 * Backend connection + staff session.
 *
 * Also owns the app bootstrap: in cloud mode the reference data has to arrive
 * before the site is meaningful, so the load state lives here rather than being
 * duplicated across four slices.
 */

const initialState = {
  mode: BACKEND_MODE, // 'cloud' | 'local'
  status: isCloudMode ? 'loading' : 'ready',
  error: '',
  session: null, // { userId, email, name, role }
  seeding: false,
};

/**
 * Load public reference data and fan it out into the domain slices.
 *
 * The fan-out uses raw action types rather than importing each slice, which
 * keeps this module free of circular imports (the slices already import from
 * `uiSlice`, and several import from here).
 */
export const bootstrap = createAsyncThunk(
  'backend/bootstrap',
  async (_, { dispatch, rejectWithValue }) => {
    if (!isCloudMode) return null;

    try {
      const [data, session] = await Promise.all([fetchPublicData(), restoreSession()]);

      dispatch({ type: 'departments/replaceAll', payload: data.departments });
      dispatch({ type: 'doctors/replaceAll', payload: data.doctors });
      dispatch({ type: 'announcements/replaceAll', payload: data.announcements });
      dispatch({ type: 'unavailability/replaceAll', payload: data.unavailability || [] });
      // `settings` may be null if updates-01.sql has not been run yet; the
      // slice defaults then stand.
      if (data.settings) {
        dispatch({ type: 'settings/settingsLoaded', payload: data.settings });
      }

      // Appointments are staff-only, so only fetch them with a live session.
      if (session) {
        const appointments = await fetchAppointments();
        dispatch({ type: 'appointments/replaceAll', payload: appointments });
      }

      return { data, session };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/** Staff sign-in. Verifies a staff_profiles row exists, not just credentials. */
export const staffSignIn = createAsyncThunk(
  'backend/staffSignIn',
  async ({ email, password }, { dispatch, rejectWithValue }) => {
    try {
      const { user, profile } = await signInStaff(email, password);
      // Appointments are staff-only, so they can only be loaded now.
      const appointments = await fetchAppointments();
      dispatch({ type: 'appointments/replaceAll', payload: appointments });
      return { userId: user.id, email: user.email, name: profile.full_name, role: profile.role };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const staffSignOut = createAsyncThunk('backend/staffSignOut', async (_, { dispatch }) => {
  await signOutStaff();
  // Drop patient data from memory the moment the session ends.
  dispatch({ type: 'appointments/replaceAll', payload: [] });
});

/** Pull the staff-only appointment list (after a restored session). */
export const loadAppointments = createAsyncThunk(
  'backend/loadAppointments',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const appointments = await fetchAppointments();
      dispatch({ type: 'appointments/replaceAll', payload: appointments });
      return appointments.length;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/** One-time push of bundled seed data into an empty database. */
export const seedBackend = createAsyncThunk('backend/seed', async (_, { rejectWithValue }) => {
  try {
    return await seedDatabase({
      departments: SEED_DEPARTMENTS,
      doctors: SEED_DOCTORS,
      announcements: SEED_ANNOUNCEMENTS,
    });
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const backendSlice = createSlice({
  name: 'backend',
  initialState,
  reducers: {
    clearBackendError(state) {
      state.error = '';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrap.pending, (state) => {
        state.status = 'loading';
        state.error = '';
      })
      .addCase(bootstrap.fulfilled, (state, action) => {
        state.status = 'ready';
        if (action.payload?.session) {
          const { user, profile } = action.payload.session;
          state.session = {
            userId: user.id,
            email: user.email,
            name: profile.full_name,
            role: profile.role,
          };
        }
      })
      .addCase(bootstrap.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload || 'Could not load hospital data.';
      })

      .addCase(staffSignIn.fulfilled, (state, action) => {
        state.session = action.payload;
        state.error = '';
      })
      .addCase(staffSignIn.rejected, (state, action) => {
        state.error = action.payload || 'Sign in failed.';
      })

      .addCase(staffSignOut.fulfilled, (state) => {
        state.session = null;
      })

      .addCase(seedBackend.pending, (state) => {
        state.seeding = true;
        state.error = '';
      })
      .addCase(seedBackend.fulfilled, (state) => {
        state.seeding = false;
      })
      .addCase(seedBackend.rejected, (state, action) => {
        state.seeding = false;
        state.error = action.payload || 'Seeding failed.';
      });
  },
});

export const { clearBackendError } = backendSlice.actions;
export default backendSlice.reducer;

/* ---------------- selectors ---------------- */
export const selectBackendMode = (state) => state.backend.mode;
export const selectIsCloud = (state) => state.backend.mode === 'cloud';
export const selectBackendStatus = (state) => state.backend.status;
export const selectBackendError = (state) => state.backend.error;
export const selectStaffSession = (state) => state.backend.session;
export const selectIsSeeding = (state) => state.backend.seeding;
