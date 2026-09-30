import { createSelector, createSlice } from '@reduxjs/toolkit';

import { SEED_DEPARTMENTS } from '../data/seed';
import { uid } from '../utils/format';
import { isCloudMode } from '../api/client';
import { deleteDepartment, insertDepartment, updateDepartmentRow } from '../api/repository';
import { pushToast } from './uiSlice';

const initialState = { items: isCloudMode ? [] : SEED_DEPARTMENTS };

const departmentsSlice = createSlice({
  name: 'departments',
  initialState,
  reducers: {
    replaceAll(state, action) {
      state.items = action.payload || [];
    },
    departmentAdded(state, action) {
      state.items.push(action.payload);
    },
    departmentUpserted(state, action) {
      const index = state.items.findIndex((d) => d.id === action.payload.id);
      if (index >= 0) state.items[index] = action.payload;
      else state.items.push(action.payload);
    },
    departmentRemoved(state, action) {
      state.items = state.items.filter((d) => d.id !== action.payload);
    },
    resetDepartments() {
      return { items: SEED_DEPARTMENTS };
    },
  },
});

export const { replaceAll, departmentAdded, departmentUpserted, departmentRemoved, resetDepartments } =
  departmentsSlice.actions;

export default departmentsSlice.reducer;

/* ---------------- action creators ---------------- */

function normalise(input) {
  return {
    name: (input.name || '').trim(),
    group: input.group || 'Adult',
    icon: input.icon || 'Stethoscope',
    accent: input.accent || 'blue',
    description: (input.description || '').trim(),
    services: input.services || [],
    isNew: Boolean(input.isNew),
  };
}

export const addDepartment = (input) => async (dispatch) => {
  const record = { id: uid('dept'), ...normalise(input) };

  if (!isCloudMode) {
    dispatch(departmentAdded(record));
    return record;
  }

  try {
    const saved = await insertDepartment(record);
    dispatch(departmentAdded(saved));
    return saved;
  } catch (error) {
    dispatch(pushToast(error.message, 'error'));
    return null;
  }
};

export const updateDepartment = ({ id, changes }) => async (dispatch, getState) => {
  const current = getState().departments.items.find((d) => d.id === id);
  const merged = { id, ...normalise({ ...current, ...changes }) };

  if (!isCloudMode) {
    dispatch(departmentUpserted(merged));
    return merged;
  }

  try {
    const saved = await updateDepartmentRow(id, merged);
    dispatch(departmentUpserted(saved));
    return saved;
  } catch (error) {
    dispatch(pushToast(error.message, 'error'));
    return null;
  }
};

export const removeDepartment = (id) => async (dispatch, getState) => {
  const snapshot = getState().departments.items.find((d) => d.id === id);
  dispatch(departmentRemoved(id));
  if (!isCloudMode) return;

  try {
    await deleteDepartment(id);
  } catch (error) {
    if (snapshot) dispatch(departmentAdded(snapshot));
    dispatch(pushToast(error.message, 'error'));
  }
};

/* ---------------- selectors ---------------- */

export const selectDepartments = (state) => state.departments.items;

export const selectDepartmentById = (id) => (state) => state.departments.items.find((d) => d.id === id);

/** `{ [departmentId]: count }` of doctors, used by the department cards. */
export const selectDoctorCountByDepartment = createSelector(
  [(state) => state.doctors.items],
  (doctors) =>
    doctors.reduce((acc, doc) => {
      acc[doc.departmentId] = (acc[doc.departmentId] || 0) + 1;
      return acc;
    }, {})
);
