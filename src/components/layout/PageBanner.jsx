import { photo } from '../../config/hospital';

/**
 * Shared hero banner for interior pages.
 *
 * Optionally sits over a real hospital photograph; the same three-layer scrim
 * approach as the homepage hero keeps white text legible over any image.
 */
export default function PageBanner({ eyebrow, title, description, image, imageAlt = '', children }) {
  return (
    <section className="relative isolate overflow-hidden bg-primary-950">
      {image && (
        <>
          <img
            src={photo(image, 1600, 700)}
            alt={imageAlt}
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
            decoding="async"
          />
          <div className="absolute inset-0 bg-primary-950/75" aria-hidden="true" />
          <div
            className="absolute inset-0 bg-gradient-to-b from-primary-950 via-primary-950/60 to-primary-950/90"
            aria-hidden="true"
          />
        </>
      )}

      {!image && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary-800 to-primary-950" aria-hidden="true" />
      )}

      <div className="container-app relative py-10 sm:py-14 lg:py-16">
        {eyebrow && (
          <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-mint-300 backdrop-blur-sm">
            {eyebrow}
          </span>
        )}
        <h1 className="mt-3 max-w-3xl text-[1.9rem] font-bold leading-[1.1] text-white [text-shadow:0_2px_20px_rgb(7_41_72_/_0.5)] sm:text-4xl lg:text-[2.9rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-primary-100 sm:text-[16.5px]">{description}</p>
        )}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}
