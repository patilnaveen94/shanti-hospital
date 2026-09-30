import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { isCloudMode } from './client';
import { fetchBookedSlots } from './repository';
import { bookedSlotsFor, selectAppointments } from '../store/appointmentsSlice';

/**
 * Which slots are taken for a doctor on a date.
 *
 * Local mode reads the in-memory appointment list. Cloud mode calls the
 * `booked_slots` database function, because an anonymous patient must be able
 * to see *that* a time is unavailable without being able to read who booked it.
 *
 * Returns `{ slots, loading }`.
 */
export function useBookedSlots(doctorId, date) {
  const appointments = useSelector(selectAppointments);
  const localSlots = bookedSlotsFor(appointments, doctorId, date);

  const [remote, setRemote] = useState({ slots: [], loading: false });

  useEffect(() => {
    if (!isCloudMode || !doctorId || !date) {
      setRemote({ slots: [], loading: false });
      return undefined;
    }

    let cancelled = false;
    setRemote({ slots: [], loading: true });

    fetchBookedSlots(doctorId, date)
      .then((slots) => {
        if (!cancelled) setRemote({ slots, loading: false });
      })
      .catch(() => {
        // Fall back to an empty set: the unique index is the real guard, so a
        // clash still fails safely at write time with a clear message.
        if (!cancelled) setRemote({ slots: [], loading: false });
      });

    return () => {
      cancelled = true;
    };
  }, [doctorId, date]);

  if (!isCloudMode) return { slots: localSlots, loading: false };

  // Merge: anything this session just booked is reflected immediately.
  return {
    slots: Array.from(new Set([...remote.slots, ...localSlots])),
    loading: remote.loading,
  };
}
