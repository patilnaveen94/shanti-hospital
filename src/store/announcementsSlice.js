import { createSelector, createSlice } from '@reduxjs/toolkit';

import { SEED_ANNOUNCEMENTS } from '../data/seed';
import { uid } from '../utils/format';
import { isCloudMode } from '../api/client';
import {
  deleteAnnouncement,
  insertAnnouncement,
  patchAnnouncement,
  updateAnnouncementRow,
} from '../api/repository';
import { pushToast } from './uiSlice';

const initialState = { items: isCloudMode ? [] : SEED_ANNOUNCEMENTS };

const announcementsSlice = createSlice({
  name: 'announcements',
  initialState,
  reducers: {
    replaceAll(state, action) {
      state.items = action.payload || [];
    },
    announcementAdded(state, action) {
      state.items.unshift(action.payload);
    },
    announcementUpserted(state, action) {
      const index = state.items.findIndex((a) => a.id === action.payload.id);
      if (index >= 0) state.items[index] = action.payload;
      else state.items.unshift(action.payload);
    },
    announcementRemoved(state, action) {
      state.items = state.items.filter((a) => a.id !== action.payload);
    },
    resetAnnouncements() {
      return { items: SEED_ANNOUNCEMENTS };
    },
  },
});

export const {
  replaceAll,
  announcementAdded,
  announcementUpserted,
  announcementRemoved,
  resetAnnouncements,
} = announcementsSlice.actions;

export default announcementsSlice.reducer;

/* ---------------- action creators ---------------- */

function normalise(input) {
  return {
    title: (input.title || '').trim(),
    message: (input.message || '').trim(),
    type: input.type || 'info',
    image: (input.image || '').trim(),
    pinned: Boolean(input.pinned),
    active: input.active !== false,
  };
}

export const addAnnouncement = (input) => async (dispatch) => {
  const base = normalise(input);

  if (!isCloudMode) {
    dispatch(announcementAdded({ id: uid('ann'), ...base, createdAt: new Date().toISOString() }));
    return;
  }

  try {
    // Postgres assigns the uuid and created_at.
    const saved = await insertAnnouncement(base);
    dispatch(announcementAdded(saved));
  } catch (error) {
    dispatch(pushToast(error.message, 'error'));
  }
};

export const updateAnnouncement = ({ id, changes }) => async (dispatch, getState) => {
  const current = getState().announcements.items.find((a) => a.id === id);
  const merged = { ...current, id, ...normalise({ ...current, ...changes }) };

  if (!isCloudMode) {
    dispatch(announcementUpserted(merged));
    return;
  }

  try {
    const saved = await updateAnnouncementRow(id, merged);
    dispatch(announcementUpserted(saved));
  } catch (error) {
    dispatch(pushToast(error.message, 'error'));
  }
};

/** Shared optimistic flag flip for `active` / `pinned`. */
const toggleFlag = (id, field) => async (dispatch, getState) => {
  const current = getState().announcements.items.find((a) => a.id === id);
  if (!current) return;
  const next = !current[field];

  dispatch(announcementUpserted({ ...current, [field]: next }));
  if (!isCloudMode) return;

  try {
    const saved = await patchAnnouncement(id, { [field]: next });
    dispatch(announcementUpserted(saved));
  } catch (error) {
    dispatch(announcementUpserted(current));
    dispatch(pushToast(error.message, 'error'));
  }
};

export const toggleAnnouncementActive = (id) => toggleFlag(id, 'active');
export const toggleAnnouncementPinned = (id) => toggleFlag(id, 'pinned');

export const removeAnnouncement = (id) => async (dispatch, getState) => {
  const snapshot = getState().announcements.items.find((a) => a.id === id);
  dispatch(announcementRemoved(id));
  if (!isCloudMode) return;

  try {
    await deleteAnnouncement(id);
  } catch (error) {
    if (snapshot) dispatch(announcementAdded(snapshot));
    dispatch(pushToast(error.message, 'error'));
  }
};

/* ---------------- selectors ---------------- */

export const selectAllAnnouncements = (state) => state.announcements.items;

/** Pinned first, then newest — drives both the ticker and the notice board. */
export const selectLiveAnnouncements = createSelector([selectAllAnnouncements], (items) =>
  items
    .filter((a) => a.active)
    .slice()
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    })
);

/** Visual treatment per announcement type. */
export const ANNOUNCEMENT_TYPES = {
  info: { label: 'Update', badge: 'bg-primary-100 text-primary-700', dot: 'bg-primary-500', icon: 'Megaphone' },
  camp: { label: 'Health Camp', badge: 'bg-mint-100 text-mint-700', dot: 'bg-mint-500', icon: 'HeartHandshake' },
  alert: { label: 'Alert', badge: 'bg-danger-100 text-danger-700', dot: 'bg-danger-500', icon: 'TriangleAlert' },
  holiday: { label: 'Timings', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', icon: 'CalendarClock' },
};

export const ANNOUNCEMENT_TYPE_KEYS = Object.keys(ANNOUNCEMENT_TYPES);

export function announcementMeta(type) {
  return ANNOUNCEMENT_TYPES[type] || ANNOUNCEMENT_TYPES.info;
}
