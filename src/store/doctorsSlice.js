import { createSlice } from '@reduxjs/toolkit';

import { SEED_DOCTORS } from '../data/seed';
import { uid } from '../utils/format';
import { isCloudMode } from '../api/client';
import {
  clearDepartmentFromDoctors,
  deleteDoctor,
  insertDoctor,
  setDoctorAvailability,
  updateDoctorRow,
} from '../api/repository';
import { pushToast } from './uiSlice';

/**
 * In local mode this slice starts from the bundled seed. In cloud mode the
 * bootstrap replaces it with rows from Postgres.
 */
const initialState = { items: isCloudMode ? [] : SEED_DOCTORS };

/** Normalise a doctor form payload into the stored shape. */
export function normaliseDoctor(input) {
  return {
    name: (input.name || '').trim(),
    departmentId: input.departmentId || '',
    specialization: (input.specialization || '').trim(),
    qualification: (input.qualification || '').trim(),
    experience: Number(input.experience) || 0,
    photo: (input.photo || '').trim(),
    opdDays: Array.isArray(input.opdDays) ? input.opdDays : [],
    opdStart: input.opdStart || '10:00',
    opdEnd: input.opdEnd || '14:00',
    // null / '' means "inherit the hospital default".
    slotMinutes: input.slotMinutes ? Number(input.slotMinutes) : null,
    fee: Number(input.fee) || 0,
    languages:
      typeof input.languages === 'string'
        ? input.languages.split(',').map((l) => l.trim()).filter(Boolean)
        : input.languages || [],
    about: (input.about || '').trim(),
    available: input.available !== false,
    // Per-doctor fee visibility, ANDed with the hospital-wide setting.
    showFee: input.showFee !== false,
  };
}

const doctorsSlice = createSlice({
  name: 'doctors',
  initialState,
  reducers: {
    /** Bulk replace — used by the bootstrap and by admin reset. */
    replaceAll(state, action) {
      state.items = action.payload || [];
    },
    doctorAdded(state, action) {
      state.items.unshift(action.payload);
    },
    doctorUpserted(state, action) {
      const index = state.items.findIndex((d) => d.id === action.payload.id);
      if (index >= 0) state.items[index] = action.payload;
      else state.items.unshift(action.payload);
    },
    doctorRemoved(state, action) {
      state.items = state.items.filter((d) => d.id !== action.payload);
    },
    departmentUnassigned(state, action) {
      state.items.forEach((doctor) => {
        if (doctor.departmentId === action.payload) doctor.departmentId = '';
      });
    },
    resetDoctors() {
      return { items: SEED_DOCTORS };
    },
  },
});

export const { replaceAll, doctorAdded, doctorUpserted, doctorRemoved, departmentUnassigned, resetDoctors } =
  doctorsSlice.actions;

export default doctorsSlice.reducer;

/* =====================================================================
   Action creators
   These keep the names the components already dispatch. In local mode they
   are plain reducer dispatches; in cloud mode they write to Postgres first
   and reconcile from the stored row, so the UI can never drift from the
   database.
   ===================================================================== */

export const addDoctor = (input) => async (dispatch) => {
  const record = { id: uid('doc'), ...normaliseDoctor(input) };

  if (!isCloudMode) {
    dispatch(doctorAdded(record));
    return record;
  }

  try {
    const saved = await insertDoctor(record);
    dispatch(doctorAdded(saved));
    return saved;
  } catch (error) {
    dispatch(pushToast(error.message, 'error'));
    return null;
  }
};

export const updateDoctor = ({ id, changes }) => async (dispatch, getState) => {
  const current = getState().doctors.items.find((d) => d.id === id);
  const merged = { id, ...normaliseDoctor({ ...current, ...changes }) };

  if (!isCloudMode) {
    dispatch(doctorUpserted(merged));
    return merged;
  }

  try {
    const saved = await updateDoctorRow(id, merged);
    dispatch(doctorUpserted(saved));
    return saved;
  } catch (error) {
    dispatch(pushToast(error.message, 'error'));
    return null;
  }
};

export const toggleDoctorAvailability = (id) => async (dispatch, getState) => {
  const current = getState().doctors.items.find((d) => d.id === id);
  if (!current) return;
  const next = !current.available;

  // Optimistic: the switch should respond instantly.
  dispatch(doctorUpserted({ ...current, available: next }));
  if (!isCloudMode) return;

  try {
    const saved = await setDoctorAvailability(id, next);
    dispatch(doctorUpserted(saved));
  } catch (error) {
    dispatch(doctorUpserted(current)); // roll back
    dispatch(pushToast(error.message, 'error'));
  }
};

export const removeDoctor = (id) => async (dispatch, getState) => {
  const snapshot = getState().doctors.items.find((d) => d.id === id);
  dispatch(doctorRemoved(id));
  if (!isCloudMode) return;

  try {
    await deleteDoctor(id);
  } catch (error) {
    if (snapshot) dispatch(doctorAdded(snapshot)); // roll back
    dispatch(pushToast(error.message, 'error'));
  }
};

/** Called when a department is deleted so no doctor points at a dead id. */
export const unassignDepartment = (departmentId) => async (dispatch) => {
  dispatch(departmentUnassigned(departmentId));
  if (!isCloudMode) return;

  try {
    await clearDepartmentFromDoctors(departmentId);
  } catch (error) {
    dispatch(pushToast(error.message, 'error'));
  }
};

/* ---------------- selectors & helpers (unchanged API) ---------------- */

export const selectDoctors = (state) => state.doctors.items;

export const selectDoctorById = (id) => (state) => state.doctors.items.find((d) => d.id === id);

/**
 * Slot maths lives in utils/schedule so the patient booking screen and the
 * admin walk-in form cannot disagree. Re-exported here for the many components
 * that already import from this module.
 */
export { buildSlots, slotMinutesFor, to12h } from '../utils/schedule';

/** OPD window as a display string, e.g. `10:00 AM – 2:00 PM`. */
export function formatOpdWindow(doctor) {
  if (!doctor?.opdStart || !doctor?.opdEnd) return 'By appointment';
  return `${hhmmTo12h(doctor.opdStart)} – ${hhmmTo12h(doctor.opdEnd)}`;
}

/** Local copy to keep `formatOpdWindow` independent of the re-export above. */
function hhmmTo12h(hhmm = '') {
  const [hStr, mStr = '00'] = String(hhmm).split(':');
  let h = Number(hStr);
  if (Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mStr} ${period}`;
}
