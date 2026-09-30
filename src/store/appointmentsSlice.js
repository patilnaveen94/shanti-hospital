import { createSelector, createSlice } from '@reduxjs/toolkit';

import { SEED_APPOINTMENTS } from '../data/seed';
import { appointmentRef, uid } from '../utils/format';
import { isCloudMode } from '../api/client';
import { deleteAppointment, insertAppointment, updateAppointmentStatus } from '../api/repository';
import { pushToast } from './uiSlice';

/**
 * In cloud mode this starts empty and is only populated for a signed-in staff
 * session — patient contact details and symptoms are not public data, and RLS
 * enforces that server-side too.
 */
const initialState = { items: isCloudMode ? [] : SEED_APPOINTMENTS };

const appointmentsSlice = createSlice({
  name: 'appointments',
  initialState,
  reducers: {
    replaceAll(state, action) {
      state.items = action.payload || [];
    },
    appointmentAdded(state, action) {
      state.items.unshift(action.payload);
    },
    appointmentUpserted(state, action) {
      const index = state.items.findIndex((a) => a.id === action.payload.id);
      if (index >= 0) state.items[index] = action.payload;
      else state.items.unshift(action.payload);
    },
    appointmentRemoved(state, action) {
      state.items = state.items.filter((a) => a.id !== action.payload);
    },
    clearAppointments(state) {
      state.items = [];
    },
    resetAppointments() {
      return { items: SEED_APPOINTMENTS };
    },
  },
});

export const {
  replaceAll,
  appointmentAdded,
  appointmentUpserted,
  appointmentRemoved,
  clearAppointments,
  resetAppointments,
} = appointmentsSlice.actions;

export default appointmentsSlice.reducer;

/* ---------------- action creators ---------------- */

/**
 * Create a booking.
 *
 * Resolves with the stored appointment, or `null` if it failed (an error toast
 * will already have been shown). The caller needs the resolved value because
 * the reference number shown to the patient must be the one that was actually
 * persisted — and in cloud mode a race on the double-booking index means the
 * write can legitimately fail.
 */
export const bookAppointment =
  ({ doctorId, departmentId, date, slot, patient, source = 'online', status = 'Pending' }) =>
  async (dispatch, getState) => {
    const draft = {
      id: uid('apt'),
      refId: appointmentRef(),
      doctorId,
      departmentId,
      date,
      slot,
      // Counter registrations are Confirmed on the spot; online requests wait
      // for staff approval.
      source,
      patient: {
        name: (patient.name || '').trim(),
        phone: (patient.phone || '').trim(),
        age: `${patient.age || ''}`.trim(),
        gender: patient.gender || '',
        symptoms: (patient.symptoms || '').trim(),
      },
      status,
      createdAt: new Date().toISOString(),
    };

    if (!isCloudMode) {
      // Local mode has no unique index behind it, so mirror the database guard
      // here — otherwise a walk-in could be dropped onto a slot the patient
      // booking screen already shows as taken.
      const clash = getState().appointments.items.find(
        (a) =>
          a.doctorId === doctorId &&
          a.date === date &&
          a.slot === slot &&
          a.status !== 'Cancelled'
      );

      if (clash) {
        dispatch(pushToast('That slot is already booked. Please pick another time.', 'error'));
        return null;
      }

      dispatch(appointmentAdded(draft));
      return draft;
    }

    try {
      const saved = await insertAppointment(draft);
      // Staff screens read from the store; patients never see this list.
      dispatch(appointmentAdded(saved));
      return saved;
    } catch (error) {
      dispatch(pushToast(error.message, 'error'));
      return null;
    }
  };

export const setAppointmentStatus =
  ({ id, status }) =>
  async (dispatch, getState) => {
    const current = getState().appointments.items.find((a) => a.id === id);
    if (!current) return;

    dispatch(appointmentUpserted({ ...current, status }));
    if (!isCloudMode) return;

    try {
      const saved = await updateAppointmentStatus(id, status);
      dispatch(appointmentUpserted(saved));
    } catch (error) {
      dispatch(appointmentUpserted(current));
      dispatch(pushToast(error.message, 'error'));
    }
  };

export const removeAppointment = (id) => async (dispatch, getState) => {
  const snapshot = getState().appointments.items.find((a) => a.id === id);
  dispatch(appointmentRemoved(id));
  if (!isCloudMode) return;

  try {
    await deleteAppointment(id);
  } catch (error) {
    if (snapshot) dispatch(appointmentAdded(snapshot));
    dispatch(pushToast(error.message, 'error'));
  }
};

/* ---------------- selectors & helpers ---------------- */

export const selectAppointments = (state) => state.appointments.items;

/**
 * Slot strings already booked for a doctor on a date, from local state.
 * Cloud mode uses the `booked_slots` RPC instead (see `useBookedSlots`), since
 * patients cannot read the appointments table.
 */
export function bookedSlotsFor(appointments, doctorId, date) {
  if (!doctorId || !date) return [];
  return appointments
    .filter((a) => a.doctorId === doctorId && a.date === date && a.status !== 'Cancelled')
    .map((a) => a.slot);
}

/** Counts per status for the admin dashboard tiles. */
export const selectAppointmentStats = createSelector([selectAppointments], (items) => {
  const today = new Date().toISOString().slice(0, 10);
  return {
    total: items.length,
    pending: items.filter((a) => a.status === 'Pending').length,
    confirmed: items.filter((a) => a.status === 'Confirmed').length,
    completed: items.filter((a) => a.status === 'Completed').length,
    cancelled: items.filter((a) => a.status === 'Cancelled').length,
    today: items.filter((a) => a.date === today && a.status !== 'Cancelled').length,
  };
});

/** Tailwind treatment per appointment status. */
export const STATUS_STYLES = {
  Pending: { badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  Confirmed: { badge: 'bg-primary-100 text-primary-800', dot: 'bg-primary-500' },
  Completed: { badge: 'bg-mint-100 text-mint-800', dot: 'bg-mint-600' },
  Cancelled: { badge: 'bg-slate-200 text-slate-600', dot: 'bg-slate-400' },
};

export function statusStyle(status) {
  return STATUS_STYLES[status] || STATUS_STYLES.Pending;
}
