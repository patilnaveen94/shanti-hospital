import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';

import { isCloudMode } from '../api/client';
import {
  addPatientPhone,
  fetchHistorySummary,
  fetchPatient,
  fetchPrescription,
  fetchVisitHistory,
  findPatientsByPhone,
  insertPatient,
  insertPrescription,
  linkAppointmentPatient,
  openPrescriptionFiles,
  searchPatientRecords,
  signPrescriptionPaths,
  updatePatientRow,
  updatePrescriptionRow,
  uploadPrescriptionPage,
} from '../api/repository';
import { uid } from '../utils/format';
import { dataUrlBytes } from '../utils/image';
import { pushToast } from './uiSlice';

/**
 * Patient records: identity, and the prescriptions attached to it.
 *
 * Patients and prescriptions share a slice because they are never used apart —
 * every prescription screen is reached through a patient, and the common flow
 * (find or create a patient, then attach a prescription) would otherwise span
 * two slices for no benefit.
 *
 * LOCAL MODE
 * localStorage holds roughly 5 MB. A compressed prescription page is ~350 KB,
 * so a dozen records would exhaust it and start throwing quota errors mid-save.
 * Local mode therefore keeps the typed notes and the ~35 KB THUMBNAIL only, and
 * the viewer says plainly that the full page needs the database. That keeps the
 * demo honest rather than appearing to store clinical images it cannot.
 */

const PAGE_SIZE = 10;

const initialState = {
  /** Phone lookup for the booking / walk-in flow. */
  lookup: { phone: '', status: 'idle', candidates: [] },
  patientsById: {},
  /** { [patientId]: { items, total, loading, loaded } } */
  historyByPatient: {},
  /**
   * Past-record summary keyed by phone, for the appointment list.
   * `{ [phone]: [{ id, mrn, fullName, visitCount, lastVisit }, ...] }`
   * Several entries where a family shares the number.
   */
  summaryByPhone: {},
  /** { [appointmentId]: patientId } — resolved links, so rows know their patient. */
  patientByAppointment: {},
  saving: false,
  /** Full-page viewer. `urls` are signed and expire, so they are not persisted. */
  viewer: { open: false, prescriptionId: '', files: [], urls: {}, loading: false, error: '' },
};

const emptyHistory = { items: [], total: 0, loading: false, loaded: false };

/* ===================== patients ===================== */

export const lookupByPhone = createAsyncThunk(
  'records/lookupByPhone',
  async (phone, { getState, rejectWithValue }) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length !== 10) return { phone: digits, candidates: [] };

    if (!isCloudMode) {
      // Local mode: match on the phones held against demo patients.
      const all = Object.values(getState().records.patientsById);
      return {
        phone: digits,
        candidates: all
          .filter((p) => (p.phones || []).some((x) => x.phone === digits))
          .map((p) => ({
            id: p.id,
            mrn: p.mrn,
            fullName: p.fullName,
            gender: p.gender,
            age: p.age ?? p.ageYears,
            phoneLabel: (p.phones.find((x) => x.phone === digits) || {}).label || '',
            lastVisit: p.lastVisit || null,
            visitCount: (getState().records.historyByPatient[p.id]?.items || []).length,
          })),
      };
    }

    try {
      return { phone: digits, candidates: await findPatientsByPhone(digits) };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createPatient = createAsyncThunk(
  'records/createPatient',
  async ({ patient, phone, phoneLabel = 'self' }, { dispatch, rejectWithValue }) => {
    const digits = String(phone || '').replace(/\D/g, '');

    if (!isCloudMode) {
      const now = new Date();
      const record = {
        id: uid('pat'),
        // Mirrors the SQL format so a demo looks like the real thing.
        mrn: `SH-${now.getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`,
        fullName: (patient.fullName || '').trim(),
        dateOfBirth: patient.dateOfBirth || '',
        ageYears: patient.ageYears == null || patient.ageYears === '' ? null : Number(patient.ageYears),
        age: patient.ageYears == null || patient.ageYears === '' ? null : Number(patient.ageYears),
        gender: patient.gender,
        notes: (patient.notes || '').trim(),
        phones: digits ? [{ phone: digits, isPrimary: true, label: phoneLabel }] : [],
        createdAt: now.toISOString(),
      };
      return record;
    }

    try {
      return await insertPatient(patient, digits, phoneLabel);
    } catch (error) {
      dispatch(pushToast(error.message, 'error'));
      return rejectWithValue(error.message);
    }
  }
);

export const updatePatient = createAsyncThunk(
  'records/updatePatient',
  async ({ id, changes }, { dispatch, getState, rejectWithValue }) => {
    if (!isCloudMode) {
      return { ...getState().records.patientsById[id], ...changes, id };
    }
    try {
      return await updatePatientRow(id, changes);
    } catch (error) {
      dispatch(pushToast(error.message, 'error'));
      return rejectWithValue(error.message);
    }
  }
);

/** The patient changed numbers, or a second number reaches them. */
export const linkPhoneToPatient = createAsyncThunk(
  'records/linkPhone',
  async ({ patientId, phone, label = '' }, { dispatch, getState, rejectWithValue }) => {
    const digits = String(phone || '').replace(/\D/g, '');

    if (!isCloudMode) {
      const existing = getState().records.patientsById[patientId];
      const phones = [...(existing?.phones || [])];
      if (!phones.some((p) => p.phone === digits)) phones.push({ phone: digits, isPrimary: false, label });
      return { ...existing, phones };
    }

    try {
      return await addPatientPhone(patientId, digits, label);
    } catch (error) {
      dispatch(pushToast(error.message, 'error'));
      return rejectWithValue(error.message);
    }
  }
);

export const loadPatient = createAsyncThunk(
  'records/loadPatient',
  async (id, { getState, rejectWithValue }) => {
    if (!isCloudMode) return getState().records.patientsById[id] || null;
    try {
      return await fetchPatient(id);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/** Name, MRN or phone. Backs the records search box. */
export const findPatients = createAsyncThunk(
  'records/findPatients',
  async (term, { getState }) => {
    if (!isCloudMode) {
      const needle = String(term || '').trim().toLowerCase();
      return Object.values(getState().records.patientsById).filter(
        (p) =>
          !needle ||
          p.fullName.toLowerCase().includes(needle) ||
          (p.mrn || '').toLowerCase().includes(needle) ||
          (p.phones || []).some((x) => x.phone.startsWith(needle))
      );
    }
    return await searchPatientRecords(term);
  }
);

/**
 * Past-record counts for a page of appointments, in one request.
 *
 * Called with every phone number visible in the list. Without the batch this
 * would be one query per row, which is twenty round trips to paint one screen.
 */
export const loadHistorySummary = createAsyncThunk(
  'records/loadHistorySummary',
  async (phones, { getState, rejectWithValue }) => {
    if (!isCloudMode) {
      // Local mode: derive the same shape from the demo patients in the store.
      const { patientsById, historyByPatient } = getState().records;
      const wanted = new Set((phones || []).filter(Boolean));
      const byPhone = {};

      Object.values(patientsById).forEach((p) => {
        (p.phones || []).forEach((ph) => {
          if (!wanted.has(ph.phone)) return;
          const items = historyByPatient[p.id]?.items || [];
          byPhone[ph.phone] = [
            ...(byPhone[ph.phone] || []),
            {
              id: p.id,
              mrn: p.mrn,
              fullName: p.fullName,
              gender: p.gender,
              age: p.age ?? p.ageYears,
              visitCount: items.length,
              lastVisit: items[0]?.issuedAt || null,
            },
          ];
        });
      });
      return byPhone;
    }

    try {
      return await fetchHistorySummary(phones);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Attach an appointment to a patient record.
 *
 * `patientId` null means "register a new patient from this appointment's own
 * details". Either way a human made the choice — nothing here infers identity
 * from the phone number.
 */
export const linkAppointment = createAsyncThunk(
  'records/linkAppointment',
  async ({ appointment, patientId = null }, { dispatch, getState, rejectWithValue }) => {
    if (!isCloudMode) {
      let resolved = patientId;

      if (!resolved) {
        const created = await dispatch(
          createPatient({
            patient: {
              fullName: appointment.patient.name,
              ageYears: appointment.patient.age,
              gender: appointment.patient.gender || 'Other',
            },
            phone: appointment.patient.phone,
          })
        );
        if (created.meta.requestStatus !== 'fulfilled') return rejectWithValue('Could not create patient.');
        resolved = created.payload.id;
      }

      return {
        appointmentId: appointment.id,
        patientId: resolved,
        patient: getState().records.patientsById[resolved] || null,
      };
    }

    try {
      const resolved = await linkAppointmentPatient(appointment.id, patientId);
      const patient = await fetchPatient(resolved);
      return { appointmentId: appointment.id, patientId: resolved, patient };
    } catch (error) {
      dispatch(pushToast(error.message, 'error'));
      return rejectWithValue(error.message);
    }
  }
);

/* ===================== prescriptions ===================== */

export const loadHistory = createAsyncThunk(
  'records/loadHistory',
  async ({ patientId, page = 0 }, { getState, rejectWithValue }) => {
    if (!isCloudMode) {
      const items = (getState().records.historyByPatient[patientId]?.items || []).slice();
      return { patientId, page, items, total: items.length, append: false };
    }

    try {
      // Reads the visit-history view, so each entry carries the symptoms
      // recorded at booking next to what was prescribed.
      const { items, total } = await fetchVisitHistory(patientId, {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      return { patientId, page, items, total, append: page > 0 };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Save a prescription and attach its pages.
 *
 * The row is inserted FIRST, then pages upload one at a time. If an upload
 * fails on hospital wifi the typed notes are already safe and the staff member
 * can retry the photo — rather than losing everything and retyping.
 */
export const savePrescription = createAsyncThunk(
  'records/savePrescription',
  async ({ prescription, pages = [], ocrEnabled = false }, { dispatch, rejectWithValue }) => {
    const hasImage = pages.length > 0;

    if (!isCloudMode) {
      // Thumbnail only — see the note at the top of this file.
      const thumbs = await Promise.all(
        pages.map(async (p, i) => ({
          id: uid('rxf'),
          pageNo: i + 1,
          thumbDataUrl: await blobToDataUrl(p.thumb.blob),
          bytes: p.full.bytes,
          width: p.full.width,
          height: p.full.height,
          localOnly: true,
        }))
      );

      return {
        record: {
          ...prescription,
          id: uid('rx'),
          issuedAt: prescription.issuedAt || new Date().toISOString(),
          ocrStatus: 'none',
          ocrText: '',
          files: thumbs,
          pageCount: thumbs.length,
          createdAt: new Date().toISOString(),
        },
        failedPages: 0,
      };
    }

    try {
      const saved = await insertPrescription({
        ...prescription,
        // Only queue OCR when there is actually an image to read.
        ocrStatus: hasImage && ocrEnabled ? 'queued' : 'none',
      });

      const files = [];
      let failedPages = 0;

      for (let i = 0; i < pages.length; i += 1) {
        try {
          files.push(await uploadPrescriptionPage(saved, pages[i], i + 1));
        } catch (error) {
          failedPages += 1;
          dispatch(pushToast(`Page ${i + 1} did not upload: ${error.message}`, 'error'));
        }
      }

      return { record: { ...saved, files, pageCount: files.length }, failedPages };
    } catch (error) {
      dispatch(pushToast(error.message, 'error'));
      return rejectWithValue(error.message);
    }
  }
);

export const editPrescription = createAsyncThunk(
  'records/editPrescription',
  async ({ id, patientId, changes }, { dispatch, rejectWithValue }) => {
    if (!isCloudMode) return { patientId, record: { id, ...changes } };
    try {
      const row = await updatePrescriptionRow(id, changes);
      return { patientId, record: row };
    } catch (error) {
      dispatch(pushToast(error.message, 'error'));
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Open the full-page viewer.
 *
 * Goes through `open_prescription`, which writes the access-log row and returns
 * the file list together, then mints short-lived signed URLs. The audit entry
 * is therefore a side effect of reading rather than something the client has to
 * remember to do.
 */
export const openPrescription = createAsyncThunk(
  'records/openPrescription',
  async (prescriptionId, { getState, rejectWithValue }) => {
    if (!isCloudMode) {
      const all = Object.values(getState().records.historyByPatient).flatMap((h) => h.items || []);
      const found = all.find((r) => r.id === prescriptionId);
      return { prescriptionId, files: found?.files || [], urls: {}, localOnly: true };
    }

    try {
      const files = await openPrescriptionFiles(prescriptionId);
      const urls = await signPrescriptionPaths(files.map((f) => f.storagePath));
      // Pull the OCR text now; the list query deliberately omits it.
      const full = await fetchPrescription(prescriptionId);
      return { prescriptionId, files, urls, record: full };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/** Signed thumbnail URLs for a page of history. */
export const signThumbnails = createAsyncThunk(
  'records/signThumbnails',
  async (paths, { rejectWithValue }) => {
    if (!isCloudMode) return {};
    try {
      return await signPrescriptionPaths(paths, 600);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the image.'));
    reader.readAsDataURL(blob);
  });
}

/* ===================== slice ===================== */

const recordsSlice = createSlice({
  name: 'records',
  initialState,
  reducers: {
    clearLookup(state) {
      state.lookup = { phone: '', status: 'idle', candidates: [] };
    },
    closeViewer(state) {
      state.viewer = { ...initialState.viewer };
    },
    /** Thumbnail URLs arrive separately from the rows that need them. */
    thumbUrlsReceived(state, action) {
      state.viewer.urls = { ...state.viewer.urls, ...(action.payload || {}) };
    },
    resetRecords() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    const upsertPatient = (state, patient) => {
      if (patient?.id) state.patientsById[patient.id] = patient;
    };

    builder
      /* ---- lookup ---- */
      .addCase(lookupByPhone.pending, (state, action) => {
        state.lookup.status = 'loading';
        state.lookup.phone = String(action.meta.arg || '').replace(/\D/g, '');
      })
      .addCase(lookupByPhone.fulfilled, (state, action) => {
        state.lookup.status = 'done';
        state.lookup.phone = action.payload.phone;
        state.lookup.candidates = action.payload.candidates;
      })
      .addCase(lookupByPhone.rejected, (state) => {
        state.lookup.status = 'done';
        state.lookup.candidates = [];
      })

      /* ---- patients ---- */
      .addCase(createPatient.fulfilled, (state, action) => {
        upsertPatient(state, action.payload);
        // The new patient becomes the only candidate for the number used.
        if (action.payload) {
          state.lookup.candidates = [
            {
              id: action.payload.id,
              mrn: action.payload.mrn,
              fullName: action.payload.fullName,
              gender: action.payload.gender,
              age: action.payload.age ?? action.payload.ageYears,
              phoneLabel: '',
              lastVisit: null,
              visitCount: 0,
            },
          ];
        }
      })
      .addCase(updatePatient.fulfilled, (state, action) => upsertPatient(state, action.payload))
      .addCase(linkPhoneToPatient.fulfilled, (state, action) => upsertPatient(state, action.payload))
      .addCase(loadPatient.fulfilled, (state, action) => upsertPatient(state, action.payload))
      .addCase(findPatients.fulfilled, (state, action) => {
        (action.payload || []).forEach((p) => upsertPatient(state, p));
      })

      /* ---- history ---- */
      .addCase(loadHistory.pending, (state, action) => {
        const id = action.meta.arg.patientId;
        state.historyByPatient[id] = { ...(state.historyByPatient[id] || emptyHistory), loading: true };
      })
      .addCase(loadHistory.fulfilled, (state, action) => {
        const { patientId, items, total, append } = action.payload;
        const prev = state.historyByPatient[patientId] || emptyHistory;
        state.historyByPatient[patientId] = {
          items: append ? [...prev.items, ...items] : items,
          total,
          loading: false,
          loaded: true,
        };
      })
      .addCase(loadHistory.rejected, (state, action) => {
        const id = action.meta.arg.patientId;
        state.historyByPatient[id] = { ...(state.historyByPatient[id] || emptyHistory), loading: false };
      })

      /* ---- save ---- */
      .addCase(savePrescription.pending, (state) => {
        state.saving = true;
      })
      .addCase(savePrescription.fulfilled, (state, action) => {
        state.saving = false;
        const record = action.payload.record;
        const bucket = state.historyByPatient[record.patientId] || emptyHistory;
        state.historyByPatient[record.patientId] = {
          ...bucket,
          items: [record, ...bucket.items],
          total: bucket.total + 1,
          loaded: true,
        };

        // Keep the appointment list's "N past records" badge in step without
        // another round trip.
        Object.keys(state.summaryByPhone).forEach((phone) => {
          state.summaryByPhone[phone] = state.summaryByPhone[phone].map((c) =>
            c.id === record.patientId
              ? { ...c, visitCount: c.visitCount + 1, lastVisit: record.issuedAt }
              : c
          );
        });
      })
      .addCase(savePrescription.rejected, (state) => {
        state.saving = false;
      })

      .addCase(editPrescription.fulfilled, (state, action) => {
        const { patientId, record } = action.payload;
        const bucket = state.historyByPatient[patientId];
        if (!bucket) return;
        const i = bucket.items.findIndex((r) => r.id === record.id);
        if (i >= 0) bucket.items[i] = { ...bucket.items[i], ...record };
      })

      /* ---- viewer ---- */
      .addCase(openPrescription.pending, (state, action) => {
        state.viewer = {
          open: true,
          prescriptionId: action.meta.arg,
          files: [],
          urls: {},
          loading: true,
          error: '',
        };
      })
      .addCase(openPrescription.fulfilled, (state, action) => {
        state.viewer.loading = false;
        state.viewer.files = action.payload.files;
        state.viewer.urls = action.payload.urls || {};
        state.viewer.localOnly = Boolean(action.payload.localOnly);

        // Merge the freshly-fetched OCR text back into the cached list row.
        const full = action.payload.record;
        if (full) {
          const bucket = state.historyByPatient[full.patientId];
          const i = bucket?.items.findIndex((r) => r.id === full.id);
          if (bucket && i >= 0) bucket.items[i] = { ...bucket.items[i], ...full };
        }
      })
      .addCase(openPrescription.rejected, (state, action) => {
        state.viewer.loading = false;
        state.viewer.error = action.payload || 'Could not open that record.';
      })

      .addCase(signThumbnails.fulfilled, (state, action) => {
        state.viewer.urls = { ...state.viewer.urls, ...(action.payload || {}) };
      })

      /* ---- appointment list integration ---- */
      .addCase(loadHistorySummary.fulfilled, (state, action) => {
        state.summaryByPhone = { ...state.summaryByPhone, ...(action.payload || {}) };
      })
      .addCase(linkAppointment.fulfilled, (state, action) => {
        const { appointmentId, patientId, patient } = action.payload;
        state.patientByAppointment[appointmentId] = patientId;
        if (patient?.id) state.patientsById[patient.id] = patient;

        // Keep the list badge in step without another round trip.
        (patient?.phones || []).forEach((ph) => {
          const existing = state.summaryByPhone[ph.phone] || [];
          if (!existing.some((c) => c.id === patientId)) {
            state.summaryByPhone[ph.phone] = [
              ...existing,
              {
                id: patientId,
                mrn: patient.mrn,
                fullName: patient.fullName,
                gender: patient.gender,
                age: patient.age ?? patient.ageYears,
                visitCount: 0,
                lastVisit: null,
              },
            ];
          }
        });
      });
  },
});

export const { clearLookup, closeViewer, thumbUrlsReceived, resetRecords } = recordsSlice.actions;
export default recordsSlice.reducer;

/* ---------------- selectors ---------------- */
export const selectLookup = (state) => state.records.lookup;
export const selectPatientsById = (state) => state.records.patientsById;
export const selectPatient = (id) => (state) => state.records.patientsById[id] || null;
export const selectSavingRecord = (state) => state.records.saving;
export const selectViewer = (state) => state.records.viewer;

export const selectHistory = (patientId) => (state) =>
  state.records.historyByPatient[patientId] || emptyHistory;

export const selectAllPatients = createSelector([selectPatientsById], (byId) =>
  Object.values(byId).sort((a, b) => a.fullName.localeCompare(b.fullName))
);

/** Is there another page to fetch? Drives the "Load older visits" button. */
export const selectHasMoreHistory = (patientId) => (state) => {
  const h = state.records.historyByPatient[patientId];
  return Boolean(h && h.items.length < h.total);
};

export const PRESCRIPTION_PAGE_SIZE = PAGE_SIZE;

export const selectSummaryByPhone = (state) => state.records.summaryByPhone;
export const selectPatientByAppointment = (state) => state.records.patientByAppointment;

/**
 * What the appointment list needs to know about one row.
 *
 * `ambiguous` is the case that matters: more than one patient on the number,
 * so the row must ask rather than assume. `linked` means staff already
 * confirmed, and the row can go straight to the prescription form.
 */
export const selectRowRecord = (appointment) => (state) => {
  if (!appointment) return { candidates: [], linkedId: '', ambiguous: false, patient: null };

  const phone = appointment.patient?.phone || '';
  const candidates = state.records.summaryByPhone[phone] || [];
  const linkedId = appointment.patientId || state.records.patientByAppointment[appointment.id] || '';

  return {
    candidates,
    linkedId,
    ambiguous: !linkedId && candidates.length > 1,
    patient: linkedId ? state.records.patientsById[linkedId] || null : null,
    pastVisits: linkedId
      ? candidates.find((c) => c.id === linkedId)?.visitCount ?? 0
      : candidates.reduce((max, c) => Math.max(max, c.visitCount), 0),
  };
};

/** Rough local-mode footprint, so the demo can warn before quota errors. */
export const selectLocalRecordBytes = createSelector(
  [(state) => state.records.historyByPatient],
  (byPatient) =>
    Object.values(byPatient)
      .flatMap((h) => h.items || [])
      .flatMap((r) => r.files || [])
      .reduce((sum, f) => sum + dataUrlBytes(f.thumbDataUrl), 0)
);
