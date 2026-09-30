import { createSlice } from '@reduxjs/toolkit';

import { isCloudMode } from '../api/client';
import { updateSettingsRow } from '../api/repository';
import { pushToast } from './uiSlice';

/**
 * Hospital-wide switches the admin controls.
 *
 * `showConsultationFees` is genuinely a policy decision, not a display
 * preference: a hospital may not want indicative fees public when the real
 * amount depends on scheme eligibility. So it gates every fee on the patient
 * side, while staff screens always show it.
 */
const initialState = {
  showConsultationFees: true,
  defaultSlotMinutes: 20,
  bookingHorizonDays: 60,

  /* Patient messaging */
  whatsappEnabled: true,
  notifyOnConfirm: true,
  notifyOnCancel: true,
  // Post-visit thank you, sent when an appointment is marked Completed.
  notifyOnComplete: true,
  /**
   * Mirrors of the Meta-approved template bodies. These do NOT change what
   * WhatsApp sends — Meta owns the approved wording. They exist so the admin
   * preview shows the real message. Empty falls back to the shipped defaults.
   */
  whatsappConfirmedBody: '',
  whatsappCancelledBody: '',
  whatsappCompletedBody: '',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    settingsLoaded(state, action) {
      return { ...state, ...(action.payload || {}) };
    },
    settingsPatched(state, action) {
      return { ...state, ...(action.payload || {}) };
    },
    resetSettings() {
      return initialState;
    },
  },
});

export const { settingsLoaded, settingsPatched, resetSettings } = settingsSlice.actions;
export default settingsSlice.reducer;

/* ---------------- action creators ---------------- */

export const updateSettings = (changes) => async (dispatch, getState) => {
  const previous = getState().settings;

  // Optimistic: a toggle should respond immediately.
  dispatch(settingsPatched(changes));
  if (!isCloudMode) return;

  try {
    const saved = await updateSettingsRow(changes);
    dispatch(settingsLoaded(saved));
  } catch (error) {
    dispatch(settingsLoaded(previous));
    dispatch(pushToast(error.message, 'error'));
  }
};

/* ---------------- selectors ---------------- */
export const selectSettings = (state) => state.settings;
export const selectShowFees = (state) => state.settings.showConsultationFees;
export const selectBookingHorizon = (state) => state.settings.bookingHorizonDays;
