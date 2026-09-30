import { createSlice } from '@reduxjs/toolkit';

import { isCloudMode } from '../api/client';
import { deleteUnavailability, insertUnavailability } from '../api/repository';
import { uid } from '../utils/format';
import { pushToast } from './uiSlice';

/**
 * Doctor leave / blocked dates.
 *
 * Separate from `doctors` because it is a list that grows and shrinks
 * independently of the consultant record, and because it is read by the public
 * booking screen while carrying no patient data.
 */
const initialState = { items: [] };

const unavailabilitySlice = createSlice({
  name: 'unavailability',
  initialState,
  reducers: {
    replaceAll(state, action) {
      state.items = action.payload || [];
    },
    blockAdded(state, action) {
      state.items.push(action.payload);
    },
    blockRemoved(state, action) {
      state.items = state.items.filter((u) => u.id !== action.payload);
    },
    resetUnavailability() {
      return { items: [] };
    },
  },
});

export const { replaceAll, blockAdded, blockRemoved, resetUnavailability } =
  unavailabilitySlice.actions;

export default unavailabilitySlice.reducer;

/* ---------------- action creators ---------------- */

export const addUnavailability = (input) => async (dispatch) => {
  const record = {
    id: uid('leave'),
    doctorId: input.doctorId,
    fromDate: input.fromDate,
    toDate: input.toDate || input.fromDate,
    reason: (input.reason || '').trim(),
    createdAt: new Date().toISOString(),
  };

  if (!isCloudMode) {
    dispatch(blockAdded(record));
    return record;
  }

  try {
    const saved = await insertUnavailability(record);
    dispatch(blockAdded(saved));
    return saved;
  } catch (error) {
    dispatch(pushToast(error.message, 'error'));
    return null;
  }
};

export const removeUnavailability = (id) => async (dispatch, getState) => {
  const snapshot = getState().unavailability.items.find((u) => u.id === id);
  dispatch(blockRemoved(id));
  if (!isCloudMode) return;

  try {
    await deleteUnavailability(id);
  } catch (error) {
    if (snapshot) dispatch(blockAdded(snapshot));
    dispatch(pushToast(error.message, 'error'));
  }
};

/* ---------------- selectors ---------------- */
export const selectUnavailability = (state) => state.unavailability.items;

export const selectUnavailabilityFor = (doctorId) => (state) =>
  state.unavailability.items
    .filter((u) => u.doctorId === doctorId)
    .slice()
    .sort((a, b) => a.fromDate.localeCompare(b.fromDate));
