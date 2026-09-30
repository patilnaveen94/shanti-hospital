import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';

import { isCloudMode } from '../api/client';
import {
  fetchAllTestimonials,
  fetchApprovedTestimonials,
  insertTestimonial,
  removeTestimonialRow,
  reviewTestimonialRow,
} from '../api/repository';
import { uid } from '../utils/format';
import { pushToast } from './uiSlice';

/**
 * Patient testimonials.
 *
 * Submissions arrive as `pending` and are invisible to the public until staff
 * approve them. That guarantee is enforced by RLS in the database, not here —
 * this slice only decides what to render.
 */
const initialState = { items: [], submitting: false, loaded: false };

/**
 * Both loaders are inert in local mode.
 *
 * `condition` matters here: without it the thunk would resolve to `[]` and the
 * fulfilled reducer would overwrite the testimonials restored from
 * localStorage, silently erasing anything submitted or approved in a demo.
 */
const cloudOnly = { condition: () => isCloudMode };

/** Public: approved testimonials for the About page. */
export const loadApprovedTestimonials = createAsyncThunk(
  'testimonials/loadApproved',
  async () => await fetchApprovedTestimonials(),
  cloudOnly
);

/** Staff: the full queue including pending and rejected. */
export const loadAllTestimonials = createAsyncThunk(
  'testimonials/loadAll',
  async () => await fetchAllTestimonials(),
  cloudOnly
);

export const submitTestimonial = createAsyncThunk(
  'testimonials/submit',
  async (input, { dispatch, rejectWithValue }) => {
    const record = {
      id: uid('tst'),
      authorName: (input.authorName || '').trim(),
      authorRole: (input.authorRole || '').trim(),
      quote: (input.quote || '').trim(),
      photo: input.photo || '',
      contactPhone: (input.contactPhone || '').trim(),
      rating: input.rating ? Number(input.rating) : null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    if (!isCloudMode) return record;

    try {
      return await insertTestimonial(record);
    } catch (error) {
      dispatch(pushToast(error.message, 'error'));
      return rejectWithValue(error.message);
    }
  }
);

export const reviewTestimonial = createAsyncThunk(
  'testimonials/review',
  async ({ id, status, note = '' }, { dispatch, rejectWithValue }) => {
    if (!isCloudMode) return { id, status, reviewNote: note };

    try {
      return await reviewTestimonialRow(id, status, note);
    } catch (error) {
      dispatch(pushToast(error.message, 'error'));
      return rejectWithValue(error.message);
    }
  }
);

export const deleteTestimonial = createAsyncThunk(
  'testimonials/delete',
  async (id, { dispatch, rejectWithValue }) => {
    if (!isCloudMode) return id;
    try {
      await removeTestimonialRow(id);
      return id;
    } catch (error) {
      dispatch(pushToast(error.message, 'error'));
      return rejectWithValue(error.message);
    }
  }
);

const testimonialsSlice = createSlice({
  name: 'testimonials',
  initialState,
  reducers: {
    replaceAll(state, action) {
      state.items = action.payload || [];
      state.loaded = true;
    },
    resetTestimonials() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    const merge = (state, action) => {
      state.items = action.payload || [];
      state.loaded = true;
    };

    builder
      .addCase(loadApprovedTestimonials.fulfilled, merge)
      .addCase(loadAllTestimonials.fulfilled, merge)

      .addCase(submitTestimonial.pending, (state) => {
        state.submitting = true;
      })
      .addCase(submitTestimonial.fulfilled, (state, action) => {
        state.submitting = false;
        // Kept in local state so the submitter sees their own pending entry in
        // the admin queue during a demo; it is not shown publicly.
        state.items.unshift(action.payload);
      })
      .addCase(submitTestimonial.rejected, (state) => {
        state.submitting = false;
      })

      .addCase(reviewTestimonial.fulfilled, (state, action) => {
        const index = state.items.findIndex((t) => t.id === action.payload.id);
        if (index >= 0) state.items[index] = { ...state.items[index], ...action.payload };
      })

      .addCase(deleteTestimonial.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => t.id !== action.payload);
      });
  },
});

export const { replaceAll, resetTestimonials } = testimonialsSlice.actions;
export default testimonialsSlice.reducer;

/* ---------------- selectors ---------------- */
export const selectTestimonials = (state) => state.testimonials.items;
export const selectSubmitting = (state) => state.testimonials.submitting;

export const selectApprovedTestimonials = createSelector([selectTestimonials], (items) =>
  items.filter((t) => t.status === 'approved')
);

export const selectPendingTestimonials = createSelector([selectTestimonials], (items) =>
  items.filter((t) => t.status === 'pending')
);

export const selectTestimonialCounts = createSelector([selectTestimonials], (items) => ({
  pending: items.filter((t) => t.status === 'pending').length,
  approved: items.filter((t) => t.status === 'approved').length,
  rejected: items.filter((t) => t.status === 'rejected').length,
}));
