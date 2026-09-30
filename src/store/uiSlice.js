import { createSlice } from '@reduxjs/toolkit';

/**
 * Ephemeral view state: active tab, admin session, modal + filter state and
 * toasts. Intentionally NOT persisted — a refresh should sign the admin out
 * and close any open modal.
 */
const initialState = {
  activeTab: 'home',
  menuOpen: false,
  isAdmin: false,
  /** Booking modal: closed | department | doctor | slot | details | success */
  booking: {
    open: false,
    step: 'department',
    departmentId: '',
    doctorId: '',
    date: '',
    slot: '',
    confirmedRef: '',
    patientName: '',
  },
  doctorFilters: { search: '', departmentId: 'all', onlyAvailable: false },
  toasts: [],
};

let toastSeq = 0;

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveTab(state, action) {
      state.activeTab = action.payload;
      state.menuOpen = false;
    },

    setMenuOpen(state, action) {
      state.menuOpen = action.payload;
    },

    signInAdmin(state) {
      state.isAdmin = true;
    },

    signOutAdmin(state) {
      state.isAdmin = false;
      state.activeTab = 'home';
    },

    /* ---------- booking flow ---------- */

    /**
     * Open the booking wizard. Passing a doctor (from a doctor card) skips
     * straight to slot selection; passing only a department pre-selects it.
     */
    openBooking(state, action) {
      const { doctorId = '', departmentId = '' } = action.payload || {};
      let step = 'department';
      if (doctorId) step = 'slot';
      else if (departmentId) step = 'doctor';

      state.booking = {
        open: true,
        step,
        departmentId,
        doctorId,
        date: '',
        slot: '',
        confirmedRef: '',
        patientName: '',
      };
    },

    closeBooking(state) {
      state.booking = { ...initialState.booking };
    },

    setBookingStep(state, action) {
      state.booking.step = action.payload;
    },

    /** Choosing a department resets any doctor/slot picked underneath it. */
    chooseBookingDepartment(state, action) {
      state.booking.departmentId = action.payload;
      state.booking.doctorId = '';
      state.booking.date = '';
      state.booking.slot = '';
      state.booking.step = 'doctor';
    },

    chooseBookingDoctor(state, action) {
      state.booking.doctorId = action.payload;
      state.booking.date = '';
      state.booking.slot = '';
      state.booking.step = 'slot';
    },

    chooseBookingDate(state, action) {
      state.booking.date = action.payload;
      state.booking.slot = '';
    },

    chooseBookingSlot(state, action) {
      state.booking.slot = action.payload;
    },

    bookingConfirmed(state, action) {
      const { refId, patientName = '' } = action.payload || {};
      state.booking.confirmedRef = refId;
      state.booking.patientName = patientName;
      state.booking.step = 'success';
    },

    /* ---------- doctor directory filters ---------- */
    setDoctorSearch(state, action) {
      state.doctorFilters.search = action.payload;
    },

    setDoctorDepartmentFilter(state, action) {
      state.doctorFilters.departmentId = action.payload;
    },

    toggleOnlyAvailable(state) {
      state.doctorFilters.onlyAvailable = !state.doctorFilters.onlyAvailable;
    },

    clearDoctorFilters(state) {
      state.doctorFilters = { ...initialState.doctorFilters };
    },

    /** Jump to the directory filtered to one department (department card tap). */
    browseDepartment(state, action) {
      state.doctorFilters = { search: '', departmentId: action.payload, onlyAvailable: false };
      state.activeTab = 'doctors';
      state.menuOpen = false;
    },

    /* ---------- toasts ---------- */
    pushToast: {
      reducer(state, action) {
        state.toasts.push(action.payload);
        // Keep the stack shallow so it never covers the screen.
        if (state.toasts.length > 3) state.toasts.shift();
      },
      prepare(message, tone = 'success') {
        toastSeq += 1;
        return { payload: { id: `toast-${toastSeq}`, message, tone } };
      },
    },

    dismissToast(state, action) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const {
  setActiveTab,
  setMenuOpen,
  signInAdmin,
  signOutAdmin,
  openBooking,
  closeBooking,
  setBookingStep,
  chooseBookingDepartment,
  chooseBookingDoctor,
  chooseBookingDate,
  chooseBookingSlot,
  bookingConfirmed,
  setDoctorSearch,
  setDoctorDepartmentFilter,
  toggleOnlyAvailable,
  clearDoctorFilters,
  browseDepartment,
  pushToast,
  dismissToast,
} = uiSlice.actions;

export default uiSlice.reducer;

/* ---------- selectors ---------- */
export const selectActiveTab = (state) => state.ui.activeTab;
export const selectMenuOpen = (state) => state.ui.menuOpen;
export const selectIsAdmin = (state) => state.ui.isAdmin;
export const selectBooking = (state) => state.ui.booking;
export const selectDoctorFilters = (state) => state.ui.doctorFilters;
export const selectToasts = (state) => state.ui.toasts;
