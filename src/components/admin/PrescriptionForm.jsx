import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Camera, FileText, Loader2, ScanText, Trash2, TriangleAlert } from 'lucide-react';

import Modal from '../common/Modal';
import { Toggle } from '../common/Bits';
import { selectDoctors } from '../../store/doctorsSlice';
import { selectDepartments } from '../../store/departmentsSlice';
import { savePrescription, selectSavingRecord } from '../../store/recordsSlice';
import { pushToast } from '../../store/uiSlice';
import { isCloudMode } from '../../api/client';
import { formatBytes, prepareDocumentImage, previewUrl } from '../../utils/image';

const MAX_PAGES = 8;

/**
 * Record a prescription: typed notes, photographed pages, or both.
 *
 * Pages are compressed on the device before upload — a 4 MB phone photo becomes
 * roughly 350 KB, which is the difference between a usable and unusable upload
 * on hospital 4G. A 400px thumbnail is produced in the same decode so the
 * history list never pulls full pages.
 *
 * `capture="environment"` opens the rear camera directly on a phone and a file
 * picker on desktop, so one input serves both without branching.
 */
export default function PrescriptionForm({ open, onClose, patient, appointmentId = '' }) {
  const dispatch = useDispatch();
  const doctors = useSelector(selectDoctors);
  const departments = useSelector(selectDepartments);
  const saving = useSelector(selectSavingRecord);
  const fileRef = useRef(null);

  const [notes, setNotes] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [pages, setPages] = useState([]); // { prepared, url, name }
  const [busy, setBusy] = useState(false);
  const [runOcr, setRunOcr] = useState(false);
  const [error, setError] = useState('');

  // Object URLs leak until revoked, and a phone session can accumulate many.
  useEffect(
    () => () => pages.forEach((p) => URL.revokeObjectURL(p.url)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const doctor = doctors.find((d) => d.id === doctorId);

  const addFiles = async (event) => {
    const chosen = [...(event.target.files || [])];
    if (fileRef.current) fileRef.current.value = '';
    if (!chosen.length) return;

    if (pages.length + chosen.length > MAX_PAGES) {
      setError(`Up to ${MAX_PAGES} pages per prescription.`);
      return;
    }

    setBusy(true);
    setError('');

    for (const file of chosen) {
      try {
        const prepared = await prepareDocumentImage(file);
        // Same photograph twice is easy when staff are unsure the first
        // upload worked; the checksum catches it before it reaches storage.
        const duplicate = prepared.checksum
          && pages.some((p) => p.prepared.checksum === prepared.checksum);
        if (duplicate) {
          dispatch(pushToast('That page has already been added.', 'info'));
          continue;
        }
        setPages((prev) => [
          ...prev,
          { prepared, url: previewUrl(prepared.full.blob), name: prepared.sourceName },
        ]);
      } catch (e) {
        setError(e.message);
      }
    }

    setBusy(false);
  };

  const removePage = (index) => {
    setPages((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].url);
      next.splice(index, 1);
      return next;
    });
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!notes.trim() && !pages.length) {
      setError('Add typed notes, a photo of the prescription, or both.');
      return;
    }

    const result = await dispatch(
      savePrescription({
        prescription: {
          patientId: patient.id,
          appointmentId,
          doctorId: doctorId || '',
          departmentId: doctor?.departmentId || '',
          notesText: notes,
          issuedAt: new Date().toISOString(),
        },
        pages: pages.map((p) => p.prepared),
        ocrEnabled: runOcr,
      })
    );

    if (result.meta.requestStatus !== 'fulfilled') return;

    const failed = result.payload.failedPages;
    dispatch(
      pushToast(
        failed
          ? `Saved, but ${failed} page${failed === 1 ? '' : 's'} did not upload. Open the record to retry.`
          : 'Prescription saved to the patient record',
        failed ? 'info' : 'success'
      )
    );

    pages.forEach((p) => URL.revokeObjectURL(p.url));
    setPages([]);
    setNotes('');
    setDoctorId('');
    onClose();
  };

  const totalBytes = pages.reduce((sum, p) => sum + p.prepared.full.bytes, 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record prescription"
      subtitle={patient ? `${patient.fullName} · ${patient.mrn}` : ''}
      size="lg"
      closeOnBackdrop={false}
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" form="rx-form" disabled={saving || busy} className="btn-primary flex-1">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : (
              'Save to record'
            )}
          </button>
        </div>
      }
    >
      <form id="rx-form" onSubmit={submit} noValidate className="space-y-5">
        {/* Consulting doctor */}
        <div>
          <label className="label" htmlFor="rx-doctor">
            Consulting doctor <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <select
            id="rx-doctor"
            className="select"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
          >
            <option value="">Not recorded</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {departments.find((x) => x.id === d.departmentId)
                  ? ` · ${departments.find((x) => x.id === d.departmentId).name}`
                  : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Pages */}
        <div>
          <span className="label">
            Prescription pages <span className="font-normal text-slate-400">(photo or scan)</span>
          </span>

          <input
            ref={fileRef}
            id="rx-pages"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            multiple
            onChange={addFiles}
            className="sr-only"
          />

          <div className="flex flex-wrap gap-2">
            <label htmlFor="rx-pages" className="btn-primary btn-sm cursor-pointer">
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Processing…
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" aria-hidden="true" />
                  {pages.length ? 'Add another page' : 'Photograph prescription'}
                </>
              )}
            </label>
            {pages.length > 0 && (
              <span className="inline-flex items-center text-[12px] text-slate-500">
                {pages.length} page{pages.length === 1 ? '' : 's'} · {formatBytes(totalBytes)} after compression
              </span>
            )}
          </div>

          {pages.length > 0 && (
            <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {pages.map((p, i) => (
                <li key={p.prepared.checksum || p.url} className="relative">
                  <img
                    src={p.url}
                    alt={`Page ${i + 1}`}
                    className="aspect-[3/4] w-full rounded-xl border border-slate-200 object-cover"
                  />
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-slate-900/70 px-1.5 py-0.5 text-[10.5px] font-bold text-white">
                    Page {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePage(i)}
                    aria-label={`Remove page ${i + 1}`}
                    className="tap absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-danger-600 shadow-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!isCloudMode && pages.length > 0 && (
            <p className="mt-2.5 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-[12px] leading-snug text-amber-900">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
              <span>
                No database is connected, so only a small preview is kept in this browser — the
                full page is not stored. Connect the hospital database to retain prescription images.
              </span>
            </p>
          )}
        </div>

        {/* Typed notes */}
        <div>
          <label className="label" htmlFor="rx-notes">
            Typed notes{' '}
            <span className="font-normal text-slate-400">— searchable, and the authoritative text</span>
          </label>
          <textarea
            id="rx-notes"
            rows={6}
            maxLength={8000}
            className="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={'Tab. Paracetamol 500 mg — 1-0-1 after food, 3 days\nSyp. Ambroxol 5 ml — twice daily\nReview after 5 days'}
          />
          <p className="mt-1.5 flex items-start gap-1.5 text-[11.5px] leading-snug text-slate-500">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Typing even the drug names makes this record searchable later. The photograph alone is
            not searchable.
          </p>
        </div>

        {/* OCR */}
        {isCloudMode && pages.length > 0 && (
          <div className="rounded-xl bg-slate-50 p-3.5">
            <Toggle
              id="rx-ocr"
              checked={runOcr}
              onChange={setRunOcr}
              label="Also try to read the text from the photo"
              description="Runs after saving and fills in a searchable transcript."
            />
            {runOcr && (
              <p className="mt-2.5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-900">
                <ScanText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                <span>
                  <strong className="font-bold">Extracted text is never the record.</strong>{' '}
                  Handwriting and drug names read badly — a misread dose is a real risk. The
                  photograph remains the prescription; the transcript is only there to make records
                  findable, and is labelled unverified wherever it appears.
                </span>
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="flex items-start gap-2 rounded-xl bg-danger-50 p-3 text-[12.5px] font-medium leading-snug text-danger-700">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
