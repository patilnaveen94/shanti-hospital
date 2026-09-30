import { useEffect, useState } from 'react';
import { ImageOff, Inbox } from 'lucide-react';

/** Section heading with optional eyebrow label and trailing action. */
export function SectionHeading({ eyebrow, title, description, action, align = 'left' }) {
  const centered = align === 'center';
  return (
    <div
      className={`mb-7 flex flex-col gap-3 sm:mb-9 ${
        centered ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between'
      }`}
    >
      <div className={centered ? 'max-w-2xl' : 'max-w-2xl'}>
        {eyebrow && (
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-700">
            {eyebrow}
          </span>
        )}
        <h2 className="text-2xl leading-tight sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/**
 * Image that degrades gracefully: shows a shimmer while loading and a neutral
 * placeholder if the remote asset fails (hospital CDN hiccup, offline, etc.).
 */
export function SmartImage({ src, alt, className = '', imgClassName = '', fallback = null, loading = 'lazy' }) {
  const [state, setState] = useState(src ? 'loading' : 'error');

  // Re-arm the loader whenever the source changes, otherwise a previously
  // failed/loaded image would keep its old state (e.g. the admin photo-URL
  // preview as the field is typed into).
  useEffect(() => {
    setState(src ? 'loading' : 'error');
  }, [src]);

  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
      {state === 'loading' && <div className="absolute inset-0 skeleton" aria-hidden="true" />}

      {state !== 'error' && (
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={() => setState('ready')}
          onError={() => setState('error')}
          className={`h-full w-full object-cover transition-opacity duration-500 ${
            state === 'ready' ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
        />
      )}

      {state === 'error' &&
        (fallback || (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
            <ImageOff className="h-7 w-7" aria-hidden="true" />
          </div>
        ))}
    </div>
  );
}

/** Coloured pill. */
export function Badge({ children, className = '', dot }) {
  return (
    <span className={`badge ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Friendly empty state used by lists, tables and filtered results. */
export function EmptyState({ icon: Icon = Inbox, title, description, action, compact = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300
                  bg-slate-50/70 text-center ${compact ? 'px-5 py-8' : 'px-6 py-14'}`}
    >
      <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-white text-slate-400 shadow-sm">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="font-semibold text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * Accessible switch used for availability / pinned / active flags.
 *
 * Built on a visually-hidden real checkbox so the whole row is clickable, the
 * control is keyboard- and screen-reader-native, and the track/knob are driven
 * by `peer-checked` rather than conditional class strings. A `<label>` cannot
 * activate a `<button>`, which is why the earlier button-based version had a
 * dead label.
 */
export function Toggle({ checked, onChange, label, description, id, disabled = false }) {
  const inputId = id || `toggle-${label}`.replace(/\s+/g, '-').toLowerCase();

  return (
    <div className="flex items-start gap-3">
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          id={inputId}
          role="switch"
          checked={Boolean(checked)}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        {/* Track */}
        <label
          htmlFor={inputId}
          aria-hidden="true"
          className="block h-6 w-11 cursor-pointer rounded-full bg-slate-300 transition-colors duration-200
                     peer-checked:bg-mint-500 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500
                     peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
        />
        {/* Knob */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm
                     transition-transform duration-200 ease-spring peer-checked:translate-x-5"
        />
      </span>

      <label htmlFor={inputId} className="min-w-0 cursor-pointer select-none">
        <span className="block text-sm font-semibold leading-snug text-slate-700">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-snug text-slate-500">{description}</span>}
      </label>
    </div>
  );
}

/** Small stat tile for dashboards. */
export function StatTile({ icon: Icon, value, label, tone = 'bg-primary-50 text-primary-700' }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}>
        {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-bold leading-none text-slate-900">{value}</span>
        <span className="mt-1 block truncate text-xs font-medium text-slate-500">{label}</span>
      </span>
    </div>
  );
}
