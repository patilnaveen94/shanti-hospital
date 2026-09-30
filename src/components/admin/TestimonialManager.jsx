import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Check,
  Clock,
  MessageSquareQuote,
  Phone,
  Star,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';

import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';
import { EmptyState, SmartImage } from '../common/Bits';
import {
  deleteTestimonial,
  reviewTestimonial,
  selectTestimonialCounts,
  selectTestimonials,
} from '../../store/testimonialsSlice';
import { pushToast } from '../../store/uiSlice';
import { formatTimestamp, initialsAvatar, relativeTime } from '../../utils/format';

const FILTERS = [
  { id: 'pending', label: 'Awaiting review' },
  { id: 'approved', label: 'Published' },
  { id: 'rejected', label: 'Not published' },
  { id: 'all', label: 'All' },
];

const STATUS_STYLE = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-mint-100 text-mint-700',
  rejected: 'bg-slate-200 text-slate-600',
};

const STATUS_LABEL = {
  pending: 'Awaiting review',
  approved: 'Published',
  rejected: 'Not published',
};

/** Read-only star row. */
function Rating({ value }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < value ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

/**
 * Reject dialog.
 *
 * The note is for the hospital's own record — why a submission was held back —
 * so it is never shown to the patient and the field says so.
 */
function RejectDialog({ open, onClose, onConfirm, name }) {
  const [note, setNote] = useState('');

  const confirm = (event) => {
    event.preventDefault();
    onConfirm(note.trim());
    setNote('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Do not publish this testimonial"
      subtitle={name}
      size="sm"
      closeOnBackdrop={false}
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" form="reject-form" className="btn-danger flex-1">
            Don&rsquo;t publish
          </button>
        </div>
      }
    >
      <form id="reject-form" onSubmit={confirm} className="space-y-4">
        <p className="text-[14px] leading-relaxed text-slate-600">
          The submission stays on record but will not appear on the website. You can publish it later if you change
          your mind.
        </p>
        <div>
          <label className="label" htmlFor="reject-note">
            Internal note <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="reject-note"
            rows={3}
            maxLength={300}
            className="textarea"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. Names another patient — asked the family for a revised version."
          />
          <p className="mt-1.5 text-[11.5px] leading-snug text-slate-500">
            For hospital records only. The patient never sees this.
          </p>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Testimonial moderation.
 *
 * Nothing a patient writes reaches the website until it is approved here. The
 * database enforces that too — the public view only selects approved rows — so
 * this screen is the intended path, not the only barrier.
 *
 * The queue is fetched by AdminDashboard, which needs the pending count for its
 * tab badge before this component mounts.
 */
export default function TestimonialManager() {
  const dispatch = useDispatch();
  const items = useSelector(selectTestimonials);
  const counts = useSelector(selectTestimonialCounts);

  const [filter, setFilter] = useState('pending');
  const [rejecting, setRejecting] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const visible = filter === 'all' ? items : items.filter((t) => t.status === filter);

  const setStatus = async (testimonial, status, note = '') => {
    const result = await dispatch(reviewTestimonial({ id: testimonial.id, status, note }));
    if (result.meta.requestStatus !== 'fulfilled') return;

    dispatch(
      pushToast(
        status === 'approved'
          ? `Published — ${testimonial.authorName}'s words are now live on the About page`
          : `Held back — ${testimonial.authorName}'s submission will not be published`,
        status === 'approved' ? 'success' : 'info'
      )
    );
  };

  const remove = async (testimonial) => {
    const result = await dispatch(deleteTestimonial(testimonial.id));
    if (result.meta.requestStatus === 'fulfilled') {
      dispatch(pushToast('Testimonial deleted', 'info'));
    }
  };

  return (
    <div>
      <header className="mb-5">
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Patient testimonials</h2>
        <p className="mt-1 text-[14px] leading-relaxed text-slate-600">
          Experiences submitted from the About page. Nothing appears on the website until you publish it.
        </p>
      </header>

      {/* Status filters, each carrying its own count so the backlog is visible
          without switching tabs. */}
      <div className="-mx-4 mb-5 px-4 sm:mx-0 sm:px-0">
        <div className="snap-rail" role="tablist" aria-label="Testimonial status">
          {FILTERS.map((item) => {
            const active = filter === item.id;
            const count = item.id === 'all' ? items.length : counts[item.id];
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(item.id)}
                className={`flex min-h-[38px] shrink-0 snap-start items-center gap-2 rounded-full px-4 text-[13px] font-bold transition-colors ${
                  active
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                }`}
              >
                {item.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                    active ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={MessageSquareQuote}
          title={
            filter === 'pending'
              ? 'Nothing waiting for review'
              : filter === 'approved'
                ? 'No testimonials published yet'
                : filter === 'rejected'
                  ? 'Nothing has been held back'
                  : 'No testimonials yet'
          }
          description={
            filter === 'pending'
              ? 'Submissions from the About page land here for approval.'
              : 'Patients can write to you from the “Share your experience” button on the About page.'
          }
        />
      ) : (
        <ul className="grid gap-3.5 lg:grid-cols-2">
          {visible.map((t) => (
            <li key={t.id} className="card flex flex-col p-5">
              {/* Author */}
              <div className="flex items-start gap-3">
                <SmartImage
                  src={t.photo || initialsAvatar(t.authorName)}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-full"
                  fallback={
                    <img
                      src={initialsAvatar(t.authorName)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  }
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14.5px] font-bold leading-snug text-slate-900">{t.authorName}</span>
                    <span className={`badge ${STATUS_STYLE[t.status] || STATUS_STYLE.pending}`}>
                      {STATUS_LABEL[t.status] || t.status}
                    </span>
                  </div>
                  {t.authorRole && <p className="mt-0.5 text-[12.5px] text-slate-500">{t.authorRole}</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Rating value={t.rating} />
                    <span
                      className="inline-flex items-center gap-1 text-[11.5px] text-slate-400"
                      title={formatTimestamp(t.createdAt)}
                    >
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {relativeTime(t.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              <blockquote className="mt-3.5 flex-1 rounded-xl bg-slate-50 p-3.5 text-[13.5px] leading-relaxed text-slate-700">
                {t.quote}
              </blockquote>

              {/* Verification number — staff-only, and never read through the
                  public view. */}
              {t.contactPhone && (
                <p className="mt-2.5 flex items-center gap-1.5 text-[12px] text-slate-500">
                  <Phone className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  <a href={`tel:${t.contactPhone}`} className="font-semibold text-primary-700 hover:underline">
                    {t.contactPhone}
                  </a>
                  <span className="text-slate-400">· given for verification, not published</span>
                </p>
              )}

              {t.status === 'rejected' && t.reviewNote && (
                <p className="mt-2.5 rounded-lg border-l-2 border-slate-300 bg-slate-50 px-3 py-2 text-[12px] leading-snug text-slate-600">
                  <span className="font-semibold text-slate-700">Internal note:</span> {t.reviewNote}
                </p>
              )}

              {/* Actions */}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3.5">
                {t.status !== 'approved' && (
                  <button type="button" onClick={() => setStatus(t, 'approved')} className="btn-primary btn-sm">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    {t.status === 'rejected' ? 'Publish after all' : 'Publish'}
                  </button>
                )}

                {t.status === 'pending' && (
                  <button type="button" onClick={() => setRejecting(t)} className="btn-secondary btn-sm">
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    Don&rsquo;t publish
                  </button>
                )}

                {t.status === 'approved' && (
                  <button
                    type="button"
                    onClick={() => setStatus(t, 'pending')}
                    className="btn-secondary btn-sm"
                    title="Remove from the website and put back in the review queue"
                  >
                    <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Unpublish
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setDeleting(t)}
                  className="btn-ghost btn-sm ml-auto text-danger-600"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <RejectDialog
        open={Boolean(rejecting)}
        name={rejecting?.authorName}
        onClose={() => setRejecting(null)}
        onConfirm={(note) => setStatus(rejecting, 'rejected', note)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => remove(deleting)}
        title="Delete this testimonial?"
        message={`${deleting?.authorName || 'This'} submission will be removed permanently, including the photo. If you only want to keep it off the website, use “Don't publish” instead.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
