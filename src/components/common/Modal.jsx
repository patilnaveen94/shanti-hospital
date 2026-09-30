import { useCallback, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Accessible dialog that behaves like a bottom sheet on phones and a centred
 * card from `sm` upwards — the pattern mobile users expect for multi-step flows.
 *
 * Handles Escape, scroll lock, focus capture and focus restore.
 */
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  labelledBy = 'modal-title',
  closeOnBackdrop = true,
}) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      // Trap Tab inside the dialog.
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // Focus the panel so screen readers announce the dialog immediately.
    const raf = requestAnimationFrame(() => panelRef.current?.focus());

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = overflow;
      if (previouslyFocused.current instanceof HTMLElement) previouslyFocused.current.focus();
    };
  }, [open]);

  if (!open) return null;

  const widths = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-xl',
    lg: 'sm:max-w-3xl',
    xl: 'sm:max-w-5xl',
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <div
        className="absolute inset-0 animate-fade-in bg-slate-900/55 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? labelledBy : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`modal-panel relative flex w-full animate-sheet-up flex-col overflow-hidden rounded-t-3xl
                    bg-white shadow-sheet focus:outline-none sm:animate-scale-in sm:rounded-3xl ${widths[size] || widths.md}`}
      >
        {/* Grab handle — a familiar affordance on touch devices */}
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden="true">
          <span className="h-1.5 w-11 rounded-full bg-slate-300" />
        </div>

        {(title || subtitle) && (
          <header className="flex items-start gap-3 border-b border-slate-100 px-5 pb-4 pt-3 sm:px-6 sm:pt-5">
            <div className="min-w-0 flex-1">
              {title && (
                <h2 id={labelledBy} className="truncate text-lg font-bold text-slate-900 sm:text-xl">
                  {title}
                </h2>
              )}
              {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="-mr-1.5 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-400
                         transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </header>
        )}

        {/*
          `min-h-0` is load-bearing: a flex item defaults to `min-height: auto`,
          which refuses to shrink below its content. Without it a long form grows
          this region, pushes the footer past the panel edge, and the Save /
          Cancel buttons become unreachable.
        */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>

        {footer && (
          <footer className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
