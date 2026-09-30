/**
 * localStorage persistence for the Redux store.
 *
 * In local mode localStorage *is* the database, so anything an admin configures
 * has to be written here or it silently reverts on the next reload. That is not
 * hypothetical: blocked dates and hospital settings were both missing from this
 * list, which made doctor leave look like it had no effect on booking.
 *
 * `ui` is deliberately excluded — admin sign-in, open modals and filters should
 * not survive a refresh.
 *
 * SEED VERSIONING
 * Reference data (departments, doctors, announcements) ships with the app, so a
 * browser holding an older snapshot would keep showing outdated records forever.
 * Each payload therefore carries the `SEED_VERSION` it was written under. When
 * that version moves, reference data is rebuilt from the current seed while
 * `appointments` — the only slice a real user creates — is carried across.
 */

const STORAGE_PREFIX = 'shanti-hospital';
const STORAGE_KEY = `${STORAGE_PREFIX}:state`;

/**
 * Bump this whenever seeded doctors / departments / announcements change in a
 * way existing visitors must pick up.
 *   1 → initial sample roster
 *   2 → real consultants + 22 departments scraped from shantihospital.in
 *   3 → brochure portraits attached to the two founding paediatricians
 */
export const SEED_VERSION = 3;

/**
 * Slices written to disk, and the shape each one must have to be trusted on the
 * way back in. Most are `{ items: [...] }`; `settings` is a flat object of
 * switches, which is why a single shape check is not enough.
 */
const PERSISTED = {
  departments: 'list',
  doctors: 'list',
  announcements: 'list',
  appointments: 'list',
  testimonials: 'list',
  // Doctor leave. Read by the public booking screen to drop blocked dates.
  unavailability: 'list',
  // Fee visibility, slot length, booking horizon, messaging switches.
  settings: 'object',
};

/** Slices rebuilt from seed when SEED_VERSION moves. */
const REFERENCE_SLICES = ['departments', 'doctors', 'announcements'];

/**
 * Per-slice in-flight flags that must not be restored. A refresh during a
 * submit would otherwise rehydrate `submitting: true` and leave the form's
 * button stuck on "Sending…" forever.
 */
const TRANSIENT_FIELDS = { testimonials: ['submitting'] };

/** Copy a slice for storage, dropping its in-flight flags. */
function stripTransient(key, slice) {
  const drop = TRANSIENT_FIELDS[key];
  if (!drop) return slice;
  const copy = { ...slice };
  drop.forEach((field) => delete copy[field]);
  return copy;
}

const canUseStorage = (() => {
  try {
    const probe = '__shanti_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    // Private browsing, disabled storage or SSR — fall back to memory only.
    return false;
  }
})();

/** Does a stored value match the shape its slice expects? */
function isSliceShaped(value, kind) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return kind === 'list' ? Array.isArray(value.items) : true;
}

/** Remove any snapshot written under a previous key scheme. */
function dropLegacyKeys() {
  if (!canUseStorage) return;
  ['shanti-hospital:v1'].forEach((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  });
}

/**
 * Read saved state for `configureStore({ preloadedState })`.
 *
 * Returns undefined when nothing usable is stored, which lets each slice fall
 * back to its own seeded initial state.
 */
export function loadState() {
  if (!canUseStorage) return undefined;
  dropLegacyKeys();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return undefined;

    const stale = parsed.seedVersion !== SEED_VERSION;

    const hydrated = {};
    Object.entries(PERSISTED).forEach(([key, kind]) => {
      // On a seed upgrade, skip reference slices so the slice defaults win.
      if (stale && REFERENCE_SLICES.includes(key)) return;
      if (isSliceShaped(parsed[key], kind)) hydrated[key] = parsed[key];
    });

    if (stale) {
      console.info(
        `[shanti] seed data updated (v${parsed.seedVersion ?? '?'} → v${SEED_VERSION}); ` +
          'doctors, departments and announcements refreshed. Appointments kept.'
      );
    }

    return Object.keys(hydrated).length ? hydrated : undefined;
  } catch (error) {
    // Corrupt or partially written payload — drop it rather than crash the app.
    console.warn('[shanti] could not read saved data, starting fresh.', error);
    clearState();
    return undefined;
  }
}

/** Write the persisted slices, stamped with the current seed version. */
export function saveState(state) {
  if (!canUseStorage) return;
  try {
    const payload = { seedVersion: SEED_VERSION };
    Object.keys(PERSISTED).forEach((key) => {
      if (state[key]) payload[key] = stripTransient(key, state[key]);
    });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    // Most likely a quota error; the app stays usable in memory.
    console.warn('[shanti] could not save data.', error);
  }
}

/** Wipe saved data — backs the admin "reset demo data" action. */
export function clearState() {
  if (!canUseStorage) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Redux middleware that mirrors the store into localStorage.
 * Writes are coalesced with rAF (falling back to a timer) so a burst of
 * actions results in a single serialise pass.
 */
export const persistMiddleware = (store) => {
  let queued = false;

  const flush = () => {
    queued = false;
    saveState(store.getState());
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(flush);
    } else {
      setTimeout(flush, 120);
    }
  };

  return (next) => (action) => {
    const result = next(action);
    // `ui/*` actions never change persisted data, so skip the work.
    if (!String(action.type).startsWith('ui/')) schedule();
    return result;
  };
};
