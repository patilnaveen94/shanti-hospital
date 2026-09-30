import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client.
 *
 * The app deliberately runs in one of two modes:
 *
 *  - "cloud"  — credentials present: Postgres is the source of truth.
 *  - "local"  — credentials absent: the existing seed + localStorage
 *               behaviour is used unchanged.
 *
 * That switch means the app is never broken by a missing backend, and the
 * cutover is a matter of filling in two environment variables rather than a
 * code change. Deployment and development can sit on opposite sides of it.
 */

const url = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

/** True when both credentials are present and look plausible. */
export const isCloudMode = Boolean(url && anonKey && url.startsWith('http'));

export const supabase = isCloudMode
  ? createClient(url, anonKey, {
      auth: {
        // Staff sessions should survive a refresh; patients never sign in.
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'shanti-hospital:auth',
      },
      db: { schema: 'public' },
    })
  : null;

export const BACKEND_MODE = isCloudMode ? 'cloud' : 'local';

/** Throw a clear error rather than a null-dereference deep in a thunk. */
export function requireClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set REACT_APP_SUPABASE_URL and ' +
        'REACT_APP_SUPABASE_ANON_KEY in .env.local, then restart the dev server.'
    );
  }
  return supabase;
}

/**
 * Normalise a PostgREST error into something a user can act on.
 * Keeps raw driver text out of the UI.
 */
export function describeError(error) {
  if (!error) return 'Something went wrong.';

  const code = error.code || '';
  const message = error.message || '';

  // Unique violation on the double-booking index.
  if (code === '23505' || /duplicate key|already exists/i.test(message)) {
    if (/no_double_booking/i.test(message)) {
      return 'That slot was just booked by someone else. Please pick another time.';
    }
    return 'That record already exists.';
  }

  // RLS rejection.
  if (code === '42501' || /row-level security|violates row-level/i.test(message)) {
    return 'You do not have permission to do that. Please sign in as staff.';
  }

  // Check-constraint failures surface as readable hints where possible.
  if (code === '23514') {
    if (/patient_phone/i.test(message)) return 'Enter a valid 10-digit mobile number.';
    if (/patient_age/i.test(message)) return 'Enter an age between 0 and 120.';
    if (/appointment_date/i.test(message)) return 'Pick a date within the next 90 days.';
    return 'Some details were not valid. Please check and try again.';
  }

  if (/Failed to fetch|NetworkError|network/i.test(message)) {
    return 'Could not reach the server. Check your internet connection.';
  }

  if (/Invalid login credentials/i.test(message)) {
    return 'Incorrect email or password.';
  }

  return message || 'Something went wrong.';
}
