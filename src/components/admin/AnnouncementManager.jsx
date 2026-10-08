import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BellPlus, Eye, EyeOff, Megaphone, Pencil, Pin, PinOff, Trash2 } from 'lucide-react';

import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';
import { EmptyState, SmartImage, Toggle } from '../common/Bits';
import { MEDIA, photo } from '../../config/hospital';
import {
  ANNOUNCEMENT_TYPE_KEYS,
  addAnnouncement,
  announcementMeta,
  removeAnnouncement,
  selectAllAnnouncements,
  toggleAnnouncementActive,
  toggleAnnouncementPinned,
  updateAnnouncement,
} from '../../store/announcementsSlice';
import { pushToast } from '../../store/uiSlice';
import { relativeTime, truncate } from '../../utils/format';

const BLANK = { title: '', message: '', type: 'info', image: '', pinned: false, active: true };

function AnnouncementForm({ open, onClose, initial, onSave, title }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});

  const set = (field) => (event) => setValues((prev) => ({ ...prev, [field]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    const found = {};
    if (!values.title.trim()) found.title = 'A headline is required.';
    if (!values.message.trim()) found.message = 'Add the announcement body.';
    setErrors(found);
    if (Object.keys(found).length) return;
    onSave(values);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle="Publishes instantly to the homepage ticker and notice board"
      closeOnBackdrop={false}
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" form="ann-form" className="btn-primary flex-1">Publish</button>
        </div>
      }
    >
      <form id="ann-form" onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label className="label" htmlFor="ann-title">Headline *</label>
          <input id="ann-title" className={`input ${errors.title ? 'input-error' : ''}`} value={values.title} onChange={set('title')} maxLength={110} placeholder="e.g. Free diabetes screening camp this Sunday" />
          {errors.title && <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.title}</p>}
        </div>

        <div>
          <label className="label" htmlFor="ann-message">Message *</label>
          <textarea id="ann-message" rows={3} maxLength={400} className={`textarea ${errors.message ? 'input-error' : ''}`} value={values.message} onChange={set('message')} placeholder="Include timings, location and whether an appointment is needed." />
          {errors.message ? (
            <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.message}</p>
          ) : (
            <p className="mt-1.5 text-right text-[11.5px] text-slate-400">{values.message.length}/400</p>
          )}
        </div>

        <div>
          <span className="label">Category</span>
          <div className="flex flex-wrap gap-2">
            {ANNOUNCEMENT_TYPE_KEYS.map((key) => {
              const meta = announcementMeta(key);
              const on = values.type === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setValues((prev) => ({ ...prev, type: key }))}
                  aria-pressed={on}
                  className={`chip ${on ? 'chip-active' : ''}`}
                >
                  <span className={`h-2 w-2 rounded-full ${on ? 'bg-white' : meta.dot}`} aria-hidden="true" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="ann-image">Banner image URL <span className="font-normal text-slate-400">(optional)</span></label>
          <input id="ann-image" className="input" value={values.image} onChange={set('image')} placeholder="Wix media filename or full https:// URL" />
          {/* Was a bare 19px-tall text link — too short to tap reliably. */}
          <button
            type="button"
            onClick={() => setValues((prev) => ({ ...prev, image: MEDIA.cardiologyLaunch }))}
            className="mt-1.5 inline-flex min-h-[40px] items-center rounded-lg px-2 -ml-2 text-[12.5px] font-bold
                       text-primary-700 underline-offset-2 transition-colors hover:bg-primary-50 hover:underline"
          >
            Use the hospital's cardiology launch banner
          </button>

          {Boolean(values.image) && (
            <SmartImage
              src={values.image.startsWith('http') ? values.image : photo(values.image, 700, 394)}
              alt=""
              className="mt-2.5 aspect-[16/9] w-full rounded-xl"
            />
          )}
        </div>

        <div className="space-y-3 rounded-xl bg-slate-50 p-3.5">
          <Toggle id="ann-pin" checked={values.pinned} onChange={(next) => setValues((prev) => ({ ...prev, pinned: next }))} label="Pin to the top" description="Pinned notices lead the ticker and the notice board." />
          <Toggle id="ann-active" checked={values.active} onChange={(next) => setValues((prev) => ({ ...prev, active: next }))} label="Visible to patients" description="Turn off to keep it as a draft without deleting." />
        </div>
      </form>
    </Modal>
  );
}

export default function AnnouncementManager() {
  const dispatch = useDispatch();
  const announcements = useSelector(selectAllAnnouncements);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const liveCount = announcements.filter((a) => a.active).length;

  return (
    <section>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl">Announcements</h2>
          <p className="mt-0.5 text-[13.5px] text-slate-500">{liveCount} live · {announcements.length - liveCount} hidden</p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="btn-primary btn-sm">
          <BellPlus className="h-4 w-4" aria-hidden="true" />
          New announcement
        </button>
      </header>

      {!announcements.length ? (
        <EmptyState icon={Megaphone} title="Nothing published yet" description="Broadcast health camps, revised timings or emergency notices to the homepage." />
      ) : (
        <ul className="space-y-3">
          {announcements.map((item) => {
            const meta = announcementMeta(item.type);
            return (
              <li key={item.id} className={`card p-4 ${item.active ? '' : 'opacity-70'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`badge ${meta.badge}`}>{meta.label}</span>
                  {item.pinned && <span className="badge bg-slate-100 text-slate-600"><Pin className="h-3 w-3" aria-hidden="true" />Pinned</span>}
                  {!item.active && <span className="badge bg-slate-200 text-slate-600">Hidden</span>}
                  <span className="ml-auto text-[11.5px] font-medium text-slate-400">{relativeTime(item.createdAt)}</span>
                </div>

                <div className="mt-2.5 flex gap-3.5">
                  {Boolean(item.image) && (
                    <SmartImage
                      src={item.image.startsWith('http') ? item.image : photo(item.image, 260, 150)}
                      alt=""
                      className="hidden h-[4.5rem] w-32 shrink-0 rounded-xl sm:block"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug text-slate-900">{item.title}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{truncate(item.message, 170)}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5 border-t border-slate-100 pt-3">
                  <button type="button" onClick={() => dispatch(toggleAnnouncementPinned(item.id))} className="btn-ghost btn-sm">
                    {item.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    {item.pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button type="button" onClick={() => dispatch(toggleAnnouncementActive(item.id))} className="btn-ghost btn-sm">
                    {item.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {item.active ? 'Hide' : 'Show'}
                  </button>
                  <button type="button" onClick={() => setEditing(item)} className="btn-secondary btn-sm">
                    <Pencil className="h-3.5 w-3.5" />Edit
                  </button>
                  <button type="button" onClick={() => setPendingDelete(item)} aria-label={`Delete ${item.title}`} className="tap grid h-11 w-11 place-items-center rounded-lg border border-danger-200 text-danger-600 transition-colors hover:bg-danger-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {creating && (
        <AnnouncementForm
          open
          onClose={() => setCreating(false)}
          initial={BLANK}
          title="New announcement"
          onSave={(values) => {
            dispatch(addAnnouncement(values));
            dispatch(pushToast('Announcement published', 'success'));
          }}
        />
      )}

      {editing && (
        <AnnouncementForm
          open
          onClose={() => setEditing(null)}
          initial={editing}
          title="Edit announcement"
          onSave={(values) => {
            dispatch(updateAnnouncement({ id: editing.id, changes: values }));
            dispatch(pushToast('Announcement updated', 'success'));
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          dispatch(removeAnnouncement(pendingDelete.id));
          dispatch(pushToast('Announcement deleted', 'info'));
        }}
        title="Delete this announcement?"
        message={pendingDelete?.title}
        confirmLabel="Delete"
      />
    </section>
  );
}
