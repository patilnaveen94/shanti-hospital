import { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, ImagePlus, Loader2, ShieldCheck, Star, Trash2 } from 'lucide-react';

import Modal from '../common/Modal';
import { SmartImage } from '../common/Bits';
import { selectSubmitting, submitTestimonial } from '../../store/testimonialsSlice';
import { pushToast } from '../../store/uiSlice';
import { initialsAvatar } from '../../utils/format';
import { downscaleImage, formatBytes } from '../../utils/image';

const MIN_QUOTE = 20;
const MAX_QUOTE = 600;

/**
 * Patient-facing testimonial submission.
 *
 * Nothing submitted here appears on the site until staff approve it. That is
 * stated plainly in the form rather than buried, because a patient who expects
 * their words to publish immediately and sees nothing will assume it failed.
 *
 * The photo is optional and downscaled in the browser before it leaves the
 * device, so no large upload and no storage bucket is involved.
 */
export default function TestimonialForm({ open, onClose }) {
  const dispatch = useDispatch();
  const submitting = useSelector(selectSubmitting);
  const fileRef = useRef(null);

  const [values, setValues] = useState({
    authorName: '',
    authorRole: '',
    quote: '',
    contactPhone: '',
    rating: 5,
  });
  const [photo, setPhoto] = useState({ dataUrl: '', bytes: 0 });
  const [photoBusy, setPhotoBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);

  const set = (field) => (event) => {
    const { value } = event.target;
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const pickPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhotoBusy(true);
    try {
      const result = await downscaleImage(file);
      setPhoto(result);
    } catch (error) {
      dispatch(pushToast(error.message, 'error'));
    } finally {
      setPhotoBusy(false);
      // Reset so picking the same file again re-triggers change.
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const validate = () => {
    const found = {};
    const name = values.authorName.trim();
    const quote = values.quote.trim();

    if (name.length < 2) found.authorName = 'Please enter your name.';
    if (quote.length < MIN_QUOTE) {
      found.quote = `Please write at least ${MIN_QUOTE} characters (${quote.length} so far).`;
    }
    // Optional, but if given it must be usable for verification.
    const digits = values.contactPhone.replace(/\D/g, '');
    if (values.contactPhone && digits.length !== 10) {
      found.contactPhone = 'Enter a 10-digit mobile number, or leave it blank.';
    }
    return found;
  };

  const submit = async (event) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    const result = await dispatch(
      submitTestimonial({ ...values, photo: photo.dataUrl })
    );

    if (result.meta.requestStatus === 'fulfilled') {
      setDone(true);
      dispatch(pushToast('Thank you — your experience has been sent for review', 'success'));
    }
  };

  const close = () => {
    setDone(false);
    onClose();
  };

  /* ---------------- thank-you state ---------------- */
  if (done) {
    return (
      <Modal open={open} onClose={close} title="Thank you" size="sm">
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-mint-100 text-mint-600">
            <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-xl font-bold text-slate-900">Sent for review</h3>
          <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-slate-600">
            Thank you for taking the time to write about your experience at Shanti Hospital. Our team reads every
            submission, and yours will appear on this page once it has been approved.
          </p>
          <button type="button" onClick={close} className="btn-primary mt-5 w-full">
            Done
          </button>
        </div>
      </Modal>
    );
  }

  const quoteLength = values.quote.trim().length;
  const preview = photo.dataUrl || initialsAvatar(values.authorName || 'You');

  return (
    <Modal
      open={open}
      onClose={close}
      title="Share your experience"
      subtitle="Reviewed by our team before it appears"
      size="md"
      closeOnBackdrop={false}
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={close} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" form="testimonial-form" disabled={submitting} className="btn-primary flex-1">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Sending…
              </>
            ) : (
              'Submit for review'
            )}
          </button>
        </div>
      }
    >
      <form id="testimonial-form" onSubmit={submit} noValidate className="space-y-4">
        {/* Moderation notice, stated up front */}
        <p className="flex items-start gap-2.5 rounded-xl bg-primary-50 p-3.5 text-[12.5px] leading-relaxed text-primary-900">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden="true" />
          <span>
            Your words will <strong className="font-bold">not appear immediately</strong>. A member of the hospital
            team reads every submission first. Please do not include medical details you would rather keep private —
            anything published here is public.
          </span>
        </p>

        {/* Photo */}
        <div>
          <span className="label">Your photo <span className="font-normal text-slate-400">(optional)</span></span>
          <div className="flex items-center gap-4">
            <SmartImage
              src={preview}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full"
              fallback={<img src={initialsAvatar(values.authorName || 'You')} alt="" className="h-full w-full object-cover" />}
            />

            <div className="min-w-0 flex-1">
              <input
                ref={fileRef}
                id="tst-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={pickPhoto}
                className="sr-only"
              />
              <div className="flex flex-wrap gap-2">
                <label htmlFor="tst-photo" className="btn-secondary btn-sm cursor-pointer">
                  {photoBusy ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                      {photo.dataUrl ? 'Change photo' : 'Choose photo'}
                    </>
                  )}
                </label>

                {photo.dataUrl && (
                  <button
                    type="button"
                    onClick={() => setPhoto({ dataUrl: '', bytes: 0 })}
                    className="btn-ghost btn-sm text-danger-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Remove
                  </button>
                )}
              </div>

              <p className="mt-1.5 text-[11.5px] leading-snug text-slate-500">
                {photo.dataUrl
                  ? `Resized on your device to ${formatBytes(photo.bytes)}.`
                  : 'JPG, PNG or WebP. Resized on your device before sending — leave blank to use your initials.'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="tst-name">Your name *</label>
            <input
              id="tst-name"
              className={`input ${errors.authorName ? 'input-error' : ''}`}
              value={values.authorName}
              onChange={set('authorName')}
              maxLength={80}
              placeholder="e.g. Laxmi Kamble"
            />
            {errors.authorName && <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.authorName}</p>}
          </div>

          <div>
            <label className="label" htmlFor="tst-role">
              Where you are from <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="tst-role"
              className="input"
              value={values.authorRole}
              onChange={set('authorRole')}
              maxLength={80}
              placeholder="e.g. Bagalkot, or Patient's mother"
            />
          </div>
        </div>

        {/* Rating */}
        <div>
          <span className="label">Your rating</span>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setValues((prev) => ({ ...prev, rating: n }))}
                aria-label={`${n} star${n === 1 ? '' : 's'}`}
                aria-pressed={values.rating === n}
                className="grid h-11 w-11 place-items-center rounded-xl transition-transform duration-150 active:scale-90"
              >
                <Star
                  className={`h-6 w-6 ${
                    n <= values.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                  }`}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="tst-quote">Your experience *</label>
          <textarea
            id="tst-quote"
            rows={5}
            maxLength={MAX_QUOTE}
            className={`textarea ${errors.quote ? 'input-error' : ''}`}
            value={values.quote}
            onChange={set('quote')}
            placeholder="What was your experience at Shanti Hospital? Which department or doctor did you visit?"
          />
          <div className="mt-1.5 flex items-start justify-between gap-3">
            {errors.quote ? (
              <p className="text-[12.5px] font-medium text-danger-600">{errors.quote}</p>
            ) : (
              <p className="text-[11.5px] text-slate-500">At least {MIN_QUOTE} characters.</p>
            )}
            <p className={`shrink-0 text-[11.5px] ${quoteLength > MAX_QUOTE - 50 ? 'text-amber-600' : 'text-slate-400'}`}>
              {quoteLength}/{MAX_QUOTE}
            </p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="tst-phone">
            Mobile number <span className="font-normal text-slate-400">(optional, never published)</span>
          </label>
          <input
            id="tst-phone"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            className={`input ${errors.contactPhone ? 'input-error' : ''}`}
            value={values.contactPhone}
            onChange={set('contactPhone')}
            placeholder="10-digit number"
          />
          {errors.contactPhone ? (
            <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.contactPhone}</p>
          ) : (
            <p className="mt-1.5 text-[11.5px] leading-snug text-slate-500">
              Only used if the hospital needs to verify your visit. It is never shown on the website.
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}
