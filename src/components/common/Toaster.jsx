import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { dismissToast, selectToasts } from '../../store/uiSlice';

const TONES = {
  success: { icon: CheckCircle2, ring: 'border-mint-200', badge: 'bg-mint-100 text-mint-700' },
  info: { icon: Info, ring: 'border-primary-200', badge: 'bg-primary-100 text-primary-700' },
  error: { icon: TriangleAlert, ring: 'border-danger-200', badge: 'bg-danger-100 text-danger-700' },
};

function Toast({ toast }) {
  const dispatch = useDispatch();
  const tone = TONES[toast.tone] || TONES.success;
  const Icon = tone.icon;

  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismissToast(toast.id)), 3800);
    return () => clearTimeout(timer);
  }, [dispatch, toast.id]);

  return (
    <div
      className={`pointer-events-auto flex w-full animate-toast-in items-start gap-3 rounded-2xl border bg-white/95
                  px-4 py-3 shadow-card-hover backdrop-blur ${tone.ring}`}
    >
      <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${tone.badge}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="flex-1 pt-0.5 text-sm font-medium leading-snug text-slate-700">{toast.message}</p>
      <button
        type="button"
        onClick={() => dispatch(dismissToast(toast.id))}
        aria-label="Dismiss notification"
        className="tap -mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Fixed, screen-reader-announced toast stack. */
export default function Toaster() {
  const toasts = useSelector(selectToasts);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[90] mx-auto
                 flex w-full max-w-sm flex-col gap-2 px-4 sm:left-auto sm:right-4 sm:mx-0"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
