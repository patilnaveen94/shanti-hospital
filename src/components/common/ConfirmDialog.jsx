import { TriangleAlert } from 'lucide-react';
import Modal from './Modal';

/**
 * Confirmation step for destructive admin actions (deleting a doctor,
 * department, announcement or resetting the demo dataset).
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  tone = 'danger',
}) {
  const confirmClass = tone === 'danger' ? 'btn-danger' : 'btn-primary';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      footer={
        <div className="flex gap-3">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Keep it
          </button>
          <button
            type="button"
            className={`${confirmClass} flex-1`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="flex gap-4">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
            tone === 'danger' ? 'bg-danger-100 text-danger-600' : 'bg-primary-100 text-primary-700'
          }`}
        >
          <TriangleAlert className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {message && <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{message}</p>}
        </div>
      </div>
    </Modal>
  );
}
