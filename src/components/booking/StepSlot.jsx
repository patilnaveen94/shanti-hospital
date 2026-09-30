import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CalendarX2, Clock, Info } from 'lucide-react';

import DatePicker from './DatePicker';
import { EmptyState } from '../common/Bits';
import { formatOpdWindow } from '../../store/doctorsSlice';
import { selectSettings } from '../../store/settingsSlice';
import { selectUnavailability } from '../../store/unavailabilitySlice';
import { useBookedSlots } from '../../api/useBookedSlots';
import { chooseBookingDate, chooseBookingSlot, setBookingStep } from '../../store/uiSlice';
import { formatLongDate } from '../../utils/format';
import { buildSlots, selectableDates, slotMinutesFor } from '../../utils/schedule';

/** Step 3 — month calendar + slot grid, honouring OPD days, leave and slot length. */
export default function StepSlot({ doctor, department, booking }) {
  const dispatch = useDispatch();
  const settings = useSelector(selectSettings);
  const unavailability = useSelector(selectUnavailability);
  const { slots: bookedSlots, loading: slotsLoading } = useBookedSlots(doctor?.id, booking.date);

  /**
   * Selectable dates = recurring OPD pattern − leave, within the booking
   * horizon. This is the allow-list; DatePicker paints the full month and greys
   * out anything absent from it, so the consultant's pattern is visible without
   * exposing *why* a given day is closed.
   */
  const days = useMemo(
    () =>
      selectableDates(doctor, {
        unavailability,
        horizonDays: settings.bookingHorizonDays,
      }),
    [doctor, unavailability, settings.bookingHorizonDays]
  );

  const stepMinutes = slotMinutesFor(doctor, settings);

  /** The first three open dates, surfaced as one-tap chips above the grid. */
  const quickDates = useMemo(() => days.slice(0, 3), [days]);

  const slots = useMemo(() => {
    if (!doctor || !booking.date) return [];
    return buildSlots(doctor, { bookedSlots, settings });
  }, [doctor, booking.date, bookedSlots, settings]);

  if (!doctor) {
    return <EmptyState title="No doctor selected" description="Please go back and pick a consultant." />;
  }

  if (!doctor.opdDays?.length) {
    return (
      <EmptyState
        icon={CalendarX2}
        title="No OPD days configured"
        description={`${doctor.name} has no OPD days set at the moment. Please call reception to schedule a consultation.`}
      />
    );
  }

  // Pattern exists, but every upcoming date is blocked by leave.
  if (!days.length) {
    return (
      <EmptyState
        icon={CalendarX2}
        title={`${doctor.name} is away`}
        description={`There are no open OPD dates in the next ${settings.bookingHorizonDays} days. Please choose another consultant, or call reception and we will help you.`}
        action={
          <button type="button" onClick={() => dispatch(setBookingStep('doctor'))} className="btn-secondary btn-sm">
            Choose another doctor
          </button>
        }
      />
    );
  }

  return (
    <div>
      {/* Selected doctor recap */}
      <div className="mb-4 flex items-start gap-3 rounded-2xl bg-primary-50/70 p-3.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-primary-700 shadow-sm">
          <Clock className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 text-[13px]">
          <p className="font-bold text-slate-900">{doctor.name}</p>
          <p className="text-slate-600">
            {department?.name} · OPD {formatOpdWindow(doctor)}
          </p>
        </div>
      </div>

      {/* Date picker — month grid, no horizontal scrolling */}
      <fieldset>
        <legend className="label">Select a date</legend>

        {/* Shortcut chips for the nearest few dates: most bookings are soon,
            and this saves hunting for them in the grid. */}
        {quickDates.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-2">
            {quickDates.map((day) => {
              const selected = booking.date === day.key;
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => dispatch(chooseBookingDate(day.key))}
                  aria-pressed={selected}
                  className={`chip !min-h-[36px] !px-3 !text-[12.5px] ${selected ? 'chip-active' : ''}`}
                >
                  {day.isToday ? 'Today' : day.isTomorrow ? 'Tomorrow' : `${day.weekday} ${day.day} ${day.month}`}
                </button>
              );
            })}
          </div>
        )}

        <DatePicker
          availableDates={days}
          value={booking.date}
          onChange={(key) => dispatch(chooseBookingDate(key))}
        />
      </fieldset>

      {/* Slot grid */}
      {booking.date ? (
        <fieldset className="mt-5">
          <legend className="label">
            Available slots · <span className="font-normal text-slate-500">{formatLongDate(booking.date)}</span>
          </legend>

          {slotsLoading ? (
            /* Checking taken slots over the network; skeletons rather than
               briefly implying every slot is free. */
            <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-4" aria-busy="true">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="skeleton h-[44px] rounded-xl" />
              ))}
            </div>
          ) : slots.length ? (
            <>
              <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => {
                  const selected = booking.slot === slot.value;
                  return (
                    <button
                      key={slot.value}
                      type="button"
                      disabled={slot.taken}
                      onClick={() => dispatch(chooseBookingSlot(slot.value))}
                      aria-pressed={selected}
                      className={`min-h-[44px] rounded-xl border text-[13px] font-bold transition-all duration-200 ease-spring
                                  active:scale-95 disabled:cursor-not-allowed ${
                                    slot.taken
                                      ? 'border-slate-200 bg-slate-100 text-slate-400 line-through'
                                      : selected
                                        ? 'border-mint-600 bg-mint-600 text-white shadow-md shadow-mint-600/20'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-mint-400 hover:bg-mint-50'
                                  }`}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 flex items-start gap-1.5 text-[11.5px] leading-snug text-slate-500">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Each consultation is {stepMinutes} minutes. Struck-through slots are already booked.
              </p>
            </>
          ) : (
            <div className="mt-2">
              <EmptyState compact title="No slots on this date" description="Please choose a different date." />
            </div>
          )}
        </fieldset>
      ) : (
        <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-[13px] text-slate-500">
          Pick a date above to see available time slots.
        </p>
      )}

      <button
        type="button"
        disabled={!booking.date || !booking.slot}
        onClick={() => dispatch(setBookingStep('details'))}
        className="btn-primary mt-6 w-full"
      >
        Continue to patient details
      </button>
    </div>
  );
}
