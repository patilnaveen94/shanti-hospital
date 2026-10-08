import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ChevronDown,
  FileImage,
  FileText,
  Loader2,
  ScanText,
  Stethoscope,
  TriangleAlert,
  ZoomIn,
} from 'lucide-react';

import Modal from '../common/Modal';
import { EmptyState } from '../common/Bits';
import { isCloudMode } from '../../api/client';
import { selectDoctors } from '../../store/doctorsSlice';
import {
  closeViewer,
  loadHistory,
  openPrescription,
  selectHasMoreHistory,
  selectHistory,
  selectViewer,
  signThumbnails,
} from '../../store/recordsSlice';
import { formatTimestamp, truncate } from '../../utils/format';

/**
 * A patient's prescription history, newest first.
 *
 * Paginated and thumbnail-only. A long-standing patient may have dozens of
 * visits; loading full pages for all of them would pull several megabytes onto
 * a phone to render a list of dates. Full pages load only when a record is
 * opened, which is also the point at which the access is logged.
 */
export default function PrescriptionHistory({ patient }) {
  const dispatch = useDispatch();
  const history = useSelector(selectHistory(patient?.id));
  const hasMore = useSelector(selectHasMoreHistory(patient?.id));
  const doctors = useSelector(selectDoctors);
  const viewer = useSelector(selectViewer);

  const [page, setPage] = useState(0);
  const [thumbUrls, setThumbUrls] = useState({});

  useEffect(() => {
    if (patient?.id) {
      setPage(0);
      dispatch(loadHistory({ patientId: patient.id, page: 0 }));
    }
  }, [dispatch, patient?.id]);

  // Thumbnails live in a private bucket, so each needs a signed URL. Batched
  // into one request per page of history rather than one per image.
  const thumbPaths = useMemo(
    () =>
      history.items
        .flatMap((r) => r.files || [])
        .map((f) => f.thumbPath || f.storagePath)
        .filter(Boolean),
    [history.items]
  );

  useEffect(() => {
    if (!isCloudMode || !thumbPaths.length) return;
    const missing = thumbPaths.filter((p) => !thumbUrls[p]);
    if (!missing.length) return;

    dispatch(signThumbnails(missing)).then((res) => {
      if (res.meta.requestStatus === 'fulfilled') {
        setThumbUrls((prev) => ({ ...prev, ...res.payload }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, thumbPaths]);

  const doctorName = (id) => doctors.find((d) => d.id === id)?.name || '';

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    dispatch(loadHistory({ patientId: patient.id, page: next }));
  };

  const thumbFor = (rx) => {
    const first = (rx.files || [])[0];
    if (!first) return null;
    if (first.thumbDataUrl) return first.thumbDataUrl; // local mode
    return thumbUrls[first.thumbPath || first.storagePath] || null;
  };

  if (!patient) return null;

  if (history.loading && !history.items.length) {
    return (
      <p className="flex items-center gap-2 py-6 text-[13.5px] text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading records…
      </p>
    );
  }

  if (!history.items.length) {
    return (
      <EmptyState
        compact
        icon={FileText}
        title="No prescriptions on record"
        description={`Nothing has been recorded for ${patient.fullName} yet.`}
      />
    );
  }

  return (
    <>
      <p className="mb-3 text-[12.5px] text-slate-500">
        {history.total} {history.total === 1 ? 'record' : 'records'}, newest first
      </p>

      <ul className="space-y-2.5">
        {history.items.map((rx) => {
          const thumb = thumbFor(rx);
          const pageCount = (rx.files || []).length;

          return (
            <li key={rx.id}>
              <button
                type="button"
                onClick={() => dispatch(openPrescription(rx.id))}
                className="tap flex w-full items-start gap-3.5 rounded-2xl border border-slate-200 bg-white p-3.5 text-left
                           transition-all duration-200 hover:border-primary-300 hover:bg-primary-50/30"
              >
                {/* Thumbnail, or a placeholder for a notes-only record */}
                <span className="relative grid h-16 w-[3.25rem] shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100">
                  {thumb ? (
                    <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <FileText className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  )}
                  {pageCount > 1 && (
                    <span className="absolute bottom-0.5 right-0.5 rounded bg-slate-900/75 px-1 text-[9.5px] font-bold text-white">
                      {pageCount}
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-bold text-slate-900">
                    {formatTimestamp(rx.issuedAt)}
                  </span>

                  {rx.doctorId && (
                    <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-slate-600">
                      <Stethoscope className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                      {doctorName(rx.doctorId)}
                    </span>
                  )}

                  {rx.notesText && (
                    <span className="mt-1 block text-[12.5px] leading-snug text-slate-600">
                      {truncate(rx.notesText.replace(/\s+/g, ' '), 90)}
                    </span>
                  )}

                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {pageCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        <FileImage className="h-3 w-3" aria-hidden="true" />
                        {pageCount} page{pageCount === 1 ? '' : 's'}
                      </span>
                    )}
                    {rx.ocrStatus === 'queued' || rx.ocrStatus === 'running' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                        Reading text…
                      </span>
                    ) : rx.ocrStatus === 'done' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        <ScanText className="h-3 w-3" aria-hidden="true" />
                        Transcript
                      </span>
                    ) : null}
                  </span>
                </span>

                <ZoomIn className="mt-1 h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      {hasMore && (
        <button type="button" onClick={loadMore} disabled={history.loading} className="btn-secondary btn-sm mt-3 w-full">
          {history.loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading…
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
              Load older visits
            </>
          )}
        </button>
      )}

      {viewer.open && (
        <PrescriptionViewer
          viewer={viewer}
          record={history.items.find((r) => r.id === viewer.prescriptionId)}
          doctorName={doctorName}
          onClose={() => dispatch(closeViewer())}
        />
      )}
    </>
  );
}

/**
 * Full-page viewer.
 *
 * The image is first and is the default tab, deliberately. The transcript is a
 * second tab behind an unverified label, so nobody reads a machine's guess at a
 * dose while believing it is the prescription.
 */
function PrescriptionViewer({ viewer, record, doctorName, onClose }) {
  const [tab, setTab] = useState('image');
  const [pageIndex, setPageIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  const files = viewer.files || [];
  const current = files[pageIndex];
  const imageUrl = current
    ? viewer.urls[current.storagePath] || current.thumbDataUrl || null
    : null;

  const hasTranscript = Boolean(record?.ocrText);

  return (
    <Modal
      open
      onClose={onClose}
      title="Prescription"
      subtitle={record ? formatTimestamp(record.issuedAt) : ''}
      size="lg"
    >
      {viewer.loading ? (
        <p className="flex items-center justify-center gap-2 py-10 text-[13.5px] text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Opening record…
        </p>
      ) : viewer.error ? (
        <p className="flex items-start gap-2 rounded-xl bg-danger-50 p-3.5 text-[13px] text-danger-700">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {viewer.error}
        </p>
      ) : (
        <div>
          {record?.doctorId && (
            <p className="mb-3 flex items-center gap-1.5 text-[13px] text-slate-600">
              <Stethoscope className="h-4 w-4 text-slate-400" aria-hidden="true" />
              {doctorName(record.doctorId)}
            </p>
          )}

          {/* Tabs */}
          <div className="mb-3 flex gap-2" role="tablist" aria-label="Prescription view">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'image'}
              onClick={() => setTab('image')}
              className={`chip ${tab === 'image' ? 'chip-active' : ''}`}
            >
              <FileImage className="h-3.5 w-3.5" aria-hidden="true" />
              Prescription
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'text'}
              onClick={() => setTab('text')}
              className={`chip ${tab === 'text' ? 'chip-active' : ''}`}
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Notes
            </button>
          </div>

          {tab === 'image' ? (
            <div>
              {imageUrl ? (
                <>
                  {/* Tap to toggle zoom; the container scrolls when zoomed so a
                      phone can pan across handwriting. */}
                  <div className={`overflow-auto rounded-xl bg-slate-900/5 ${zoomed ? 'max-h-[60vh]' : ''}`}>
                    <img
                      src={imageUrl}
                      alt={`Prescription page ${pageIndex + 1}`}
                      onClick={() => setZoomed((z) => !z)}
                      className={`mx-auto cursor-zoom-in rounded-xl ${
                        zoomed ? 'w-auto max-w-none cursor-zoom-out' : 'max-h-[55vh] w-auto'
                      }`}
                      style={zoomed ? { height: '150vh' } : undefined}
                    />
                  </div>
                  <p className="mt-2 text-center text-[11.5px] text-slate-500">
                    Tap the image to {zoomed ? 'fit' : 'zoom'}
                  </p>
                </>
              ) : viewer.localOnly ? (
                <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3.5 text-[12.5px] leading-relaxed text-amber-900">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                  <span>
                    Full prescription images are not stored without the hospital database — this
                    browser keeps only a small preview. See <code className="font-mono font-bold">README-backend.md</code>.
                  </span>
                </p>
              ) : (
                <EmptyState compact icon={FileText} title="No image on this record" description="This prescription was recorded as typed notes only." />
              )}

              {files.length > 1 && (
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {files.map((f, i) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => { setPageIndex(i); setZoomed(false); }}
                      aria-pressed={i === pageIndex}
                      className={`tap h-9 min-w-9 rounded-lg px-2.5 text-[12px] font-bold ${
                        i === pageIndex ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="label">Typed notes</p>
                {record?.notesText ? (
                  <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3.5 text-[13.5px] leading-relaxed text-slate-800">
                    {record.notesText}
                  </p>
                ) : (
                  <p className="rounded-xl bg-slate-50 p-3.5 text-[13px] text-slate-500">
                    Nothing was typed for this visit.
                  </p>
                )}
              </div>

              {hasTranscript && (
                <div>
                  <p className="label">
                    Extracted from the photo{' '}
                    <span className="font-normal text-amber-700">— unverified</span>
                  </p>
                  <p className="mb-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-900">
                    <ScanText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                    <span>
                      Read by software, not a person. Doses and drug names are frequently wrong.
                      <strong className="font-bold"> Treat the image as the prescription</strong> — this
                      text exists only to make records searchable.
                    </span>
                  </p>
                  <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3.5 font-mono text-[12.5px] leading-relaxed text-slate-600">
                    {record.ocrText}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
