import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { CalendarRange, Clock, Eye, IndianRupee, Info, MessageCircle } from 'lucide-react';

import { Toggle } from '../common/Bits';
import MessagePreview from './MessagePreview';
import { selectSettings, updateSettings } from '../../store/settingsSlice';
import { selectDoctors } from '../../store/doctorsSlice';
import { pushToast } from '../../store/uiSlice';
import { SLOT_OPTIONS } from '../../utils/schedule';
import { countHiddenFees } from '../../utils/fees';
import {
  MESSAGE_KINDS,
  TEMPLATE_VARIABLES,
  bodyFor,
  kindEnabled,
} from '../../utils/messageTemplates';

const HORIZONS = [7, 14, 30, 45, 60, 90];

/** Hospital-wide switches. */
export default function SettingsManager() {
  const dispatch = useDispatch();
  const settings = useSelector(selectSettings);
  const doctors = useSelector(selectDoctors);

  const [activeKind, setActiveKind] = useState('confirmed');
  const activeMeta = MESSAGE_KINDS.find((k) => k.id === activeKind) || MESSAGE_KINDS[0];
  const currentBody = bodyFor(activeKind, settings);
  const [draft, setDraft] = useState(currentBody);

  // Re-sync the editor when the tab changes or a save lands.
  useEffect(() => {
    setDraft(bodyFor(activeKind, settings));
  }, [activeKind, settings]);

  const hiddenFeeCount = countHiddenFees(doctors);

  const save = (changes, message) => {
    dispatch(updateSettings(changes));
    if (message) dispatch(pushToast(message, 'success'));
  };

  return (
    <section>
      <header className="mb-4">
        <h2 className="text-xl">Hospital settings</h2>
        <p className="mt-0.5 text-[13.5px] text-slate-500">
          These apply across the whole patient-facing site.
        </p>
      </header>

      <div className="space-y-3">
        {/* Fee visibility */}
        <div className="card p-5">
          <div className="flex items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint-100 text-mint-700">
              <IndianRupee className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-bold text-slate-900">Consultation fees</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                Controls whether patients see fee amounts on doctor cards, in the booking flow and on the
                departments page. Staff screens always show fees regardless of this setting.
              </p>

              <div className="mt-4 rounded-xl bg-slate-50 p-3.5">
                <Toggle
                  id="set-show-fees"
                  checked={settings.showConsultationFees}
                  onChange={(next) =>
                    save(
                      { showConsultationFees: next },
                      next ? 'Fees are now visible to patients' : 'Fees are now hidden from patients'
                    )
                  }
                  label={settings.showConsultationFees ? 'Fees are visible to patients' : 'Fees are hidden from patients'}
                  description="Turn off if the amount payable depends on scheme eligibility and a published figure would mislead."
                />
              </div>

              <p className="mt-3 flex items-start gap-2 text-[12px] leading-snug text-slate-500">
                <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Fees remain stored against each doctor either way — hiding them does not delete anything. Individual
                consultants can also be hidden one by one under <strong className="font-semibold">Doctors</strong>
                {hiddenFeeCount > 0 && (
                  <>
                    {' '}
                    — <strong className="font-semibold text-slate-700">{hiddenFeeCount} currently hidden</strong>
                  </>
                )}
                .
              </p>
            </div>
          </div>
        </div>

        {/* Default slot length */}
        <div className="card p-5">
          <div className="flex items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-100 text-primary-700">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-bold text-slate-900">Default consultation length</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                Used for any doctor who has no specific length set. Change a single doctor under{' '}
                <strong className="font-semibold">Doctors</strong>.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {SLOT_OPTIONS.map((minutes) => {
                  const on = settings.defaultSlotMinutes === minutes;
                  return (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => save({ defaultSlotMinutes: minutes }, `Default slot set to ${minutes} minutes`)}
                      aria-pressed={on}
                      className={`chip ${on ? 'chip-active' : ''}`}
                    >
                      {minutes} min
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-[12px] leading-snug text-slate-500">
                Changing this alters how many slots each OPD session offers. Existing appointments keep their
                original times.
              </p>
            </div>
          </div>
        </div>

        {/* ---------------- Patient messages ---------------- */}
        <div className="card p-5">
          <div className="flex items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint-100 text-mint-700">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-bold text-slate-900">WhatsApp messages to patients</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                A different message goes out at each stage of a visit — confirmed, cancelled, and a thank you once the
                consultation is done. Choose which ones are sent, and preview exactly what a patient receives.
              </p>

              <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-3.5">
                <Toggle
                  id="set-wa-enabled"
                  checked={settings.whatsappEnabled}
                  onChange={(next) =>
                    save({ whatsappEnabled: next }, next ? 'WhatsApp messages enabled' : 'WhatsApp messages paused')
                  }
                  label={settings.whatsappEnabled ? 'WhatsApp messaging is on' : 'WhatsApp messaging is paused'}
                  description="Master switch. Turn off to stop all patient messages without changing anything else."
                />

                {/* One switch per message, driven by MESSAGE_KINDS so adding a
                    stage cannot leave this list behind. */}
                {MESSAGE_KINDS.map((kind) => (
                  <Toggle
                    key={kind.id}
                    id={`set-wa-${kind.id}`}
                    checked={settings[kind.toggleKey] !== false}
                    disabled={!settings.whatsappEnabled}
                    onChange={(next) => save({ [kind.toggleKey]: next }, 'Saved')}
                    label={`Send on status “${kind.status}” — ${kind.label.toLowerCase()}`}
                    description={kind.description}
                  />
                ))}
              </div>

              {/* How this actually works — the important caveat */}
              <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[12.5px] leading-relaxed text-amber-900">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                <span>
                  <strong className="font-bold">The wording is approved by Meta, not set here.</strong> WhatsApp only
                  delivers templates it has approved, so editing the text below does <em>not</em> change what patients
                  receive — it keeps this preview accurate. To change the real wording, edit the template in WhatsApp
                  Manager, resubmit for approval, then paste the new text here so they match.
                </span>
              </div>

              {/* Kind selector */}
              <div className="mt-4">
                <div className="snap-rail pb-1" role="tablist" aria-label="Message type">
                  {MESSAGE_KINDS.map((kind) => {
                    const on = activeKind === kind.id;
                    return (
                      <button
                        key={kind.id}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        onClick={() => setActiveKind(kind.id)}
                        className={`chip snap-start ${on ? 'chip-active' : ''}`}
                      >
                        {kind.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                {/* Editable mirror */}
                <div>
                  <label className="label" htmlFor="wa-body">
                    Template text <span className="font-normal text-slate-400">(mirror of the approved template)</span>
                  </label>
                  <textarea
                    id="wa-body"
                    rows={12}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="textarea font-mono text-[12.5px] leading-relaxed"
                  />

                  <p className="mt-1.5 text-[11.5px] text-slate-500">
                    Meta template name: <code className="font-mono font-bold">{activeMeta.template}</code>
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={draft === currentBody}
                      onClick={() => {
                        save({ [activeMeta.settingKey]: draft }, 'Preview text saved');
                      }}
                      className="btn-primary btn-sm"
                    >
                      Save preview text
                    </button>
                    <button
                      type="button"
                      disabled={draft === currentBody}
                      onClick={() => setDraft(currentBody)}
                      className="btn-secondary btn-sm"
                    >
                      Discard changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraft(activeMeta.fallback)}
                      className="btn-ghost btn-sm"
                    >
                      Reset to default
                    </button>
                  </div>

                  {/* Variable reference */}
                  <div className="mt-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Variables</p>
                    <ul className="mt-2 space-y-1">
                      {TEMPLATE_VARIABLES.map((v) => (
                        <li key={v.token} className="flex items-center gap-2 text-[12px]">
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-bold text-slate-700">
                            {v.token}
                          </code>
                          <span className="text-slate-600">{v.label}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[11.5px] leading-snug text-slate-500">
                      The order is fixed by the approved template. Renumbering here would put details in the wrong
                      places for patients.
                    </p>
                  </div>
                </div>

                {/* Live preview */}
                <div>
                  <p className="label">Preview with sample data</p>
                  <MessagePreview
                    body={draft}
                    params={TEMPLATE_VARIABLES.map((v) => v.example)}
                    disabled={!kindEnabled(activeKind, settings)}
                    note="Every appointment gets its own real values. Use Preview on a booking in the Appointments tab to see one exactly as that patient would."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Booking horizon */}
        <div className="card p-5">
          <div className="flex items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
              <CalendarRange className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-bold text-slate-900">How far ahead patients can book</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                A shorter window keeps the schedule manageable; a longer one suits follow-ups.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {HORIZONS.map((days) => {
                  const on = settings.bookingHorizonDays === days;
                  return (
                    <button
                      key={days}
                      type="button"
                      onClick={() => save({ bookingHorizonDays: days }, `Patients can now book ${days} days ahead`)}
                      aria-pressed={on}
                      className={`chip ${on ? 'chip-active' : ''}`}
                    >
                      {days} days
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 flex items-start gap-2 text-[12px] leading-snug text-slate-500">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                The database independently caps bookings at 90 days, so this can only narrow the window.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
