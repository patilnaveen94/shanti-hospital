import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { isCloudMode } from '../api/client';
import { fetchNotificationStatuses, sendAppointmentMessage } from '../api/repository';
import { kindEnabled } from '../utils/messageTemplates';
import { pushToast } from './uiSlice';

/**
 * WhatsApp notification state, keyed by appointment id.
 *
 * Deliberately separate from `appointments`: whether a patient was *told* is a
 * different fact from what was *booked*, and staff need to see both. A silent
 * delivery failure is how patients turn up on the wrong day.
 */

const initialState = {
  /** { [appointmentId]: { status, error, at, sending } } */
  byAppointment: {},
};

/** Send (or resend) a WhatsApp message for one appointment. */
export const notifyPatient = createAsyncThunk(
  'notifications/notify',
  async ({ appointmentId, kind = 'confirmed', silent = false, force = false }, { dispatch, getState }) => {
    // Respect the admin switches. `force` covers the manual Send / Retry
    // buttons, where a human has explicitly asked for this one message.
    const settings = getState().settings;
    if (!force && !kindEnabled(kind, settings)) {
      return { appointmentId, status: 'skipped', error: 'Messaging is switched off in Settings.' };
    }

    if (!isCloudMode) {
      // No backend: be honest rather than showing a fake success.
      if (!silent) {
        dispatch(pushToast('WhatsApp needs the backend connected — see README-backend.md', 'info'));
      }
      return { appointmentId, status: 'skipped', error: 'No backend configured.' };
    }

    const result = await sendAppointmentMessage(appointmentId, kind);

    if (!silent) {
      if (result.status === 'sent') {
        dispatch(pushToast('WhatsApp message sent to the patient', 'success'));
      } else if (result.status === 'skipped') {
        dispatch(pushToast(result.error || 'Message skipped.', 'info'));
      } else {
        dispatch(pushToast(`WhatsApp failed: ${result.error || 'unknown error'}`, 'error'));
      }
    }

    return { appointmentId, status: result.status, error: result.error };
  }
);

/** Load the latest attempt per appointment when the tracker opens. */
export const loadNotificationStatuses = createAsyncThunk(
  'notifications/load',
  async () => (isCloudMode ? await fetchNotificationStatuses() : {})
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    clearNotifications(state) {
      state.byAppointment = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(notifyPatient.pending, (state, action) => {
        const id = action.meta.arg.appointmentId;
        state.byAppointment[id] = { ...(state.byAppointment[id] || {}), sending: true };
      })
      .addCase(notifyPatient.fulfilled, (state, action) => {
        const { appointmentId, status, error } = action.payload;
        state.byAppointment[appointmentId] = {
          status,
          error: error || null,
          at: new Date().toISOString(),
          sending: false,
        };
      })
      .addCase(notifyPatient.rejected, (state, action) => {
        const id = action.meta.arg.appointmentId;
        state.byAppointment[id] = {
          status: 'failed',
          error: action.error?.message || 'Send failed.',
          at: new Date().toISOString(),
          sending: false,
        };
      })
      .addCase(loadNotificationStatuses.fulfilled, (state, action) => {
        Object.entries(action.payload || {}).forEach(([id, value]) => {
          state.byAppointment[id] = { ...value, sending: false };
        });
      });
  },
});

export const { clearNotifications } = notificationsSlice.actions;
export default notificationsSlice.reducer;

/* ---------------- selectors ---------------- */
export const selectNotifications = (state) => state.notifications.byAppointment;

export const selectNotificationFor = (appointmentId) => (state) =>
  state.notifications.byAppointment[appointmentId] || null;

/** Badge treatment per delivery status. */
export const NOTIFICATION_STYLES = {
  sent: { label: 'WhatsApp sent', badge: 'bg-mint-100 text-mint-700' },
  failed: { label: 'Not delivered', badge: 'bg-danger-100 text-danger-700' },
  skipped: { label: 'Not sent', badge: 'bg-slate-200 text-slate-600' },
  queued: { label: 'Sending…', badge: 'bg-amber-100 text-amber-800' },
};

export function notificationStyle(status) {
  return NOTIFICATION_STYLES[status] || NOTIFICATION_STYLES.skipped;
}
