import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, EyeOff, Info, KeyRound, LockKeyhole, Mail, ShieldCheck, TriangleAlert } from 'lucide-react';

import { ADMIN_PASSCODE } from '../../config/hospital';
import { selectIsCloud } from '../../store/backendSlice';
import { staffSignIn } from '../../store/backendSlice';
import { pushToast, signInAdmin } from '../../store/uiSlice';

/**
 * Staff sign-in.
 *
 * Cloud mode: real email + password against Supabase Auth, then a server-side
 * check that the account has an active `staff_profiles` row. Authentication and
 * authorisation are separate — a valid login with no staff row is rejected.
 *
 * Local mode: falls back to the demo passcode so the prototype still runs with
 * no backend configured. That gate is NOT security; it ships in the bundle.
 */
export default function AdminLogin() {
  const dispatch = useDispatch();
  const isCloud = useSelector(selectIsCloud);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submitCloud = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    const result = await dispatch(staffSignIn({ email: email.trim(), password }));
    setBusy(false);

    if (result.meta.requestStatus === 'fulfilled') {
      dispatch(signInAdmin());
      dispatch(pushToast('Signed in to the admin dashboard', 'success'));
    } else {
      setError(result.payload || 'Sign in failed.');
      setPassword('');
    }
  };

  const submitLocal = (event) => {
    event.preventDefault();
    if (code.trim() === ADMIN_PASSCODE) {
      setError('');
      dispatch(signInAdmin());
      dispatch(pushToast('Signed in to the admin dashboard', 'success'));
    } else {
      setError('That passcode is not correct. Please try again.');
      setCode('');
    }
  };

  return (
    <section className="section-pad">
      <div className="container-app">
        <div className="mx-auto max-w-md">
          <div className="card p-6 sm:p-8">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 text-primary-700">
              <LockKeyhole className="h-7 w-7" aria-hidden="true" />
            </span>

            <h1 className="mt-5 text-2xl">Staff sign in</h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-slate-600">
              {isCloud
                ? 'Sign in with your hospital staff account to manage doctors, departments, announcements and appointments.'
                : 'Enter the hospital passcode to manage doctors, departments, announcements and appointment bookings.'}
            </p>

            {isCloud ? (
              /* ---------------- real auth ---------------- */
              <form onSubmit={submitCloud} className="mt-6" noValidate>
                <label className="label" htmlFor="staff-email">
                  Work email
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="staff-email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    className={`input pl-10 ${error ? 'input-error' : ''}`}
                    placeholder="name@shantihospital.in"
                  />
                </div>

                <label className="label mt-4" htmlFor="staff-password">
                  Password
                </label>
                <div className="relative">
                  <KeyRound
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="staff-password"
                    type={reveal ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'staff-error' : undefined}
                    className={`input pl-10 pr-12 ${error ? 'input-error' : ''}`}
                    placeholder="Your password"
                  />
                  <button
                    type="button"
                    onClick={() => setReveal((r) => !r)}
                    aria-label={reveal ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {error && (
                  <p id="staff-error" role="alert" className="mt-2 text-[13px] font-medium text-danger-600">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy || !email.trim() || !password}
                  className="btn-primary mt-4 w-full"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  {busy ? 'Signing in…' : 'Sign in'}
                </button>

                <p className="mt-4 text-[12px] leading-relaxed text-slate-500">
                  Accounts are created by the hospital administrator. If you cannot sign in, contact them rather than
                  registering a new account.
                </p>
              </form>
            ) : (
              /* ---------------- demo passcode ---------------- */
              <form onSubmit={submitLocal} className="mt-6" noValidate>
                <label className="label" htmlFor="admin-passcode">
                  Admin passcode
                </label>
                <div className="relative">
                  <KeyRound
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="admin-passcode"
                    type={reveal ? 'text' : 'password'}
                    value={code}
                    onChange={(event) => {
                      setCode(event.target.value);
                      if (error) setError('');
                    }}
                    autoComplete="current-password"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'admin-error' : undefined}
                    className={`input pl-10 pr-12 ${error ? 'input-error' : ''}`}
                    placeholder="Enter passcode"
                  />
                  <button
                    type="button"
                    onClick={() => setReveal((r) => !r)}
                    aria-label={reveal ? 'Hide passcode' : 'Show passcode'}
                    className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {error && (
                  <p id="admin-error" role="alert" className="mt-2 text-[13px] font-medium text-danger-600">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={!code.trim()} className="btn-primary mt-4 w-full">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Sign in
                </button>

                <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-amber-50 p-3.5 text-[12.5px] leading-relaxed text-amber-900">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                  <span>
                    <strong className="font-bold">Demo passcode:</strong>{' '}
                    <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono font-bold">{ADMIN_PASSCODE}</code>
                    <span className="mt-1 block">
                      No backend is configured, so this runs entirely in the browser and is not real authentication.
                    </span>
                  </span>
                </div>

                <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-slate-200 p-3.5 text-[12.5px] leading-relaxed text-slate-600">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <span>
                    To switch on real accounts, set <code className="font-mono">REACT_APP_SUPABASE_URL</code> and{' '}
                    <code className="font-mono">REACT_APP_SUPABASE_ANON_KEY</code>. See{' '}
                    <code className="font-mono">README-backend.md</code>.
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
