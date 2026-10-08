import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EyeOff, Pencil, Plus, Search, Stethoscope, Trash2, UserPlus } from 'lucide-react';

import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';
import { EmptyState, SmartImage, Toggle } from '../common/Bits';
import { WEEKDAYS } from '../../config/hospital';
import { selectDepartments } from '../../store/departmentsSlice';
import {
  addDoctor,
  formatOpdWindow,
  removeDoctor,
  selectDoctors,
  toggleDoctorAvailability,
  updateDoctor,
} from '../../store/doctorsSlice';
import { selectSettings } from '../../store/settingsSlice';
import { pushToast } from '../../store/uiSlice';
import { initialsAvatar } from '../../utils/format';
import { SLOT_OPTIONS, buildSlots } from '../../utils/schedule';
import { isFeeVisible } from '../../utils/fees';

const BLANK = {
  name: '',
  departmentId: '',
  specialization: '',
  qualification: '',
  experience: '',
  photo: '',
  opdDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  opdStart: '10:00',
  opdEnd: '14:00',
  slotMinutes: '',
  fee: '',
  languages: '',
  about: '',
  available: true,
  showFee: true,
};

function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = 'Doctor name is required.';
  if (!values.departmentId) errors.departmentId = 'Assign a department.';
  if (!values.specialization.trim()) errors.specialization = 'Specialisation is required.';
  if (!values.qualification.trim()) errors.qualification = 'Qualifications are required.';
  if (values.experience === '' || Number(values.experience) < 0) errors.experience = 'Enter years of experience.';
  if (values.fee === '' || Number(values.fee) < 0) errors.fee = 'Enter a consultation fee.';
  if (!values.opdDays.length) errors.opdDays = 'Select at least one OPD day.';
  if (values.opdStart >= values.opdEnd) errors.opdEnd = 'End time must be after the start time.';
  return errors;
}

/** Add / edit form, shared by both create and update flows. */
function DoctorForm({ open, onClose, initial, departments, onSave, title }) {
  const settings = useSelector(selectSettings);
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});

  const defaultSlot = settings.defaultSlotMinutes;

  // Live count so admins can see the effect of the slot length immediately.
  const slotPreview = buildSlots(
    { opdStart: values.opdStart, opdEnd: values.opdEnd, slotMinutes: values.slotMinutes },
    { settings }
  ).length;

  const set = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const toggleDay = (day) =>
    setValues((prev) => ({
      ...prev,
      opdDays: prev.opdDays.includes(day) ? prev.opdDays.filter((d) => d !== day) : [...prev.opdDays, day],
    }));

  const submit = (event) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    onSave(values);
    onClose();
  };

  const monogram = initialsAvatar(values.name || 'Dr');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle="Changes appear on the patient directory immediately"
      size="lg"
      closeOnBackdrop={false}
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" form="doctor-form" className="btn-primary flex-1">
            Save doctor
          </button>
        </div>
      }
    >
      <form id="doctor-form" onSubmit={submit} noValidate className="space-y-4">
        {/* Preview */}
        <div className="flex items-center gap-3.5 rounded-2xl bg-slate-50 p-3.5">
          <SmartImage
            src={values.photo || monogram}
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl"
            fallback={<img src={monogram} alt="" className="h-full w-full object-cover" />}
          />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{values.name || 'New doctor'}</p>
            <p className="truncate text-[13px] text-primary-700">{values.specialization || 'Specialisation'}</p>
            <p className="mt-0.5 text-[11.5px] text-slate-500">Live preview of the directory card</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="d-name">Full name *</label>
            <input id="d-name" className={`input ${errors.name ? 'input-error' : ''}`} value={values.name} onChange={set('name')} placeholder="Dr. Full Name" />
            {errors.name && <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.name}</p>}
          </div>

          <div>
            <label className="label" htmlFor="d-dept">Department *</label>
            <select id="d-dept" className={`select ${errors.departmentId ? 'input-error' : ''}`} value={values.departmentId} onChange={set('departmentId')}>
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {errors.departmentId && <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.departmentId}</p>}
          </div>

          <div>
            <label className="label" htmlFor="d-spec">Specialisation *</label>
            <input id="d-spec" className={`input ${errors.specialization ? 'input-error' : ''}`} value={values.specialization} onChange={set('specialization')} placeholder="Interventional Cardiologist" />
            {errors.specialization && <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.specialization}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="d-qual">Qualifications *</label>
            <input id="d-qual" className={`input ${errors.qualification ? 'input-error' : ''}`} value={values.qualification} onChange={set('qualification')} placeholder="MBBS, MD (General Medicine), DM (Cardiology)" />
            {errors.qualification && <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.qualification}</p>}
          </div>

          <div>
            <label className="label" htmlFor="d-exp">Experience (years) *</label>
            <input id="d-exp" type="number" min="0" max="70" className={`input ${errors.experience ? 'input-error' : ''}`} value={values.experience} onChange={set('experience')} placeholder="12" />
            {errors.experience && <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.experience}</p>}
          </div>

          <div>
            <label className="label" htmlFor="d-fee">Consultation fee (₹) *</label>
            <input id="d-fee" type="number" min="0" className={`input ${errors.fee ? 'input-error' : ''}`} value={values.fee} onChange={set('fee')} placeholder="500" />
            {errors.fee && <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.fee}</p>}
          </div>

          <div>
            <label className="label" htmlFor="d-start">OPD starts *</label>
            <input id="d-start" type="time" className="input" value={values.opdStart} onChange={set('opdStart')} />
          </div>

          <div>
            <label className="label" htmlFor="d-end">OPD ends *</label>
            <input id="d-end" type="time" className={`input ${errors.opdEnd ? 'input-error' : ''}`} value={values.opdEnd} onChange={set('opdEnd')} />
            {errors.opdEnd && <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.opdEnd}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="d-slot">Consultation length</label>
            <select id="d-slot" className="select" value={values.slotMinutes || ''} onChange={set('slotMinutes')}>
              <option value="">Use hospital default ({defaultSlot} min)</option>
              {SLOT_OPTIONS.map((m) => (
                <option key={m} value={m}>{m} minutes</option>
              ))}
            </select>
            <p className="mt-1.5 text-[12px] text-slate-500">
              Sets how many bookable slots this doctor&apos;s OPD session is divided into.{' '}
              {values.opdStart && values.opdEnd && slotPreview > 0 && (
                <strong className="font-semibold text-slate-700">
                  {slotPreview} slot{slotPreview === 1 ? '' : 's'} per session.
                </strong>
              )}
            </p>
          </div>

          <div className="sm:col-span-2">
            <span className="label">OPD days *</span>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => {
                const on = values.opdDays.includes(day);
                return (
                  <button key={day} type="button" onClick={() => toggleDay(day)} aria-pressed={on} className={`chip !min-h-[42px] !px-3.5 ${on ? 'chip-active' : ''}`}>
                    {day}
                  </button>
                );
              })}
            </div>
            {errors.opdDays && <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.opdDays}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="d-photo">Photo URL <span className="font-normal text-slate-400">(optional)</span></label>
            <input id="d-photo" type="url" className="input" value={values.photo} onChange={set('photo')} placeholder="https://… (leave blank to use an initials avatar)" />
            <p className="mt-1.5 text-[12px] text-slate-500">Only upload photographs you have the doctor's consent to publish.</p>
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="d-lang">Languages</label>
            <input id="d-lang" className="input" value={Array.isArray(values.languages) ? values.languages.join(', ') : values.languages} onChange={set('languages')} placeholder="Kannada, Hindi, English" />
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="d-about">Short profile</label>
            <textarea id="d-about" rows={2} maxLength={280} className="textarea" value={values.about} onChange={set('about')} placeholder="One line patients will see on the directory card." />
          </div>

          <div className="space-y-3 sm:col-span-2 rounded-xl bg-slate-50 p-3.5">
            <Toggle
              id="d-available"
              checked={values.available}
              onChange={(next) => setValues((prev) => ({ ...prev, available: next }))}
              label="Accepting appointments"
              description="Turn off while the doctor is on leave — patients can still see the profile but cannot book."
            />

            <Toggle
              id="d-show-fee"
              checked={values.showFee !== false}
              onChange={(next) => setValues((prev) => ({ ...prev, showFee: next }))}
              label="Show this fee to patients"
              description={
                settings.showConsultationFees
                  ? 'Turn off to hide only this consultant\u2019s fee. Staff screens still show it.'
                  : 'Fees are currently hidden hospital-wide under Settings, so this has no effect yet.'
              }
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

/** Doctor CRUD — card list on mobile, table from `lg` up. */
export default function DoctorManager() {
  const dispatch = useDispatch();
  const doctors = useSelector(selectDoctors);
  const departments = useSelector(selectDepartments);
  const settings = useSelector(selectSettings);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  const deptName = (id) => departments.find((d) => d.id === id)?.name || 'Unassigned';

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return doctors.filter((d) => {
      if (deptFilter !== 'all' && d.departmentId !== deptFilter) return false;
      if (!needle) return true;
      return [d.name, d.specialization, d.qualification, deptName(d.departmentId)]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [doctors, query, deptFilter, departments]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = (values) => {
    dispatch(addDoctor(values));
    dispatch(pushToast(`${values.name} added to the directory`, 'success'));
  };

  const handleUpdate = (values) => {
    dispatch(updateDoctor({ id: editing.id, changes: values }));
    dispatch(pushToast(`${values.name} updated`, 'success'));
  };

  return (
    <section>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl">Doctors</h2>
          <p className="mt-0.5 text-[13.5px] text-slate-500">
            {doctors.length} listed · {doctors.filter((d) => d.available).length} accepting appointments
          </p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="btn-primary btn-sm">
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Add doctor
        </button>
      </header>

      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search doctors…" aria-label="Search doctors" className="input pl-10" />
        </div>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} aria-label="Filter by department" className="select sm:w-60">
          <option value="all">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {!rows.length ? (
        <EmptyState
          icon={Stethoscope}
          title="No doctors match"
          description="Adjust the search or add a new consultant to the directory."
          action={<button type="button" onClick={() => setCreating(true)} className="btn-primary btn-sm"><Plus className="h-4 w-4" />Add doctor</button>}
        />
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="space-y-3 lg:hidden">
            {rows.map((doctor) => {
              const monogram = initialsAvatar(doctor.name);
              return (
                <li key={doctor.id} className="card p-4">
                  <div className="flex gap-3">
                    <SmartImage src={doctor.photo || monogram} alt="" className="h-14 w-14 shrink-0 rounded-xl" fallback={<img src={monogram} alt="" className="h-full w-full object-cover" />} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{doctor.name}</p>
                      <p className="truncate text-[12.5px] text-primary-700">{doctor.specialization}</p>
                      <p className="mt-0.5 truncate text-[11.5px] text-slate-500">{deptName(doctor.departmentId)} · ₹{doctor.fee} · {doctor.experience} yrs</p>
                    </div>
                  </div>

                  <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11.5px] text-slate-600">
                    {formatOpdWindow(doctor)} · {doctor.opdDays?.join(' ') || 'No days set'}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <Toggle id={`avail-${doctor.id}`} checked={doctor.available} onChange={() => dispatch(toggleDoctorAvailability(doctor.id))} label={doctor.available ? 'Available' : 'On leave'} />
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => setEditing(doctor)} aria-label={`Edit ${doctor.name}`} className="tap grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setPendingDelete(doctor)} aria-label={`Remove ${doctor.name}`} className="tap grid h-11 w-11 place-items-center rounded-xl border border-danger-200 text-danger-600 transition-colors hover:bg-danger-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Desktop table */}
          <div className="card hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11.5px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-bold">Doctor</th>
                    <th scope="col" className="px-4 py-3 font-bold">Department</th>
                    <th scope="col" className="px-4 py-3 font-bold">OPD schedule</th>
                    <th scope="col" className="px-4 py-3 font-bold">Fee</th>
                    <th scope="col" className="px-4 py-3 font-bold">Status</th>
                    <th scope="col" className="px-4 py-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((doctor) => {
                    const monogram = initialsAvatar(doctor.name);
                    return (
                      <tr key={doctor.id} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <SmartImage src={doctor.photo || monogram} alt="" className="h-10 w-10 shrink-0 rounded-lg" fallback={<img src={monogram} alt="" className="h-full w-full object-cover" />} />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">{doctor.name}</p>
                              <p className="text-[12px] text-slate-500">{doctor.specialization} · {doctor.experience} yrs</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{deptName(doctor.departmentId)}</td>
                        <td className="px-4 py-3">
                          <p className="text-slate-700">{formatOpdWindow(doctor)}</p>
                          <p className="text-[12px] text-slate-500">{doctor.opdDays?.join(' ') || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-700">₹{doctor.fee}</span>
                          {/* Staff always see the amount; flag when patients do not. */}
                          {!isFeeVisible(doctor, settings) && (
                            <span
                              className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-slate-400"
                              title={
                                settings.showConsultationFees
                                  ? 'Hidden for this doctor'
                                  : 'Fees hidden hospital-wide'
                              }
                            >
                              <EyeOff className="h-3 w-3" aria-hidden="true" />
                              hidden
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => dispatch(toggleDoctorAvailability(doctor.id))}
                            className={`badge transition-opacity hover:opacity-80 ${doctor.available ? 'bg-mint-100 text-mint-700' : 'bg-slate-200 text-slate-600'}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${doctor.available ? 'bg-mint-500' : 'bg-slate-400'}`} />
                            {doctor.available ? 'Available' : 'On leave'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button type="button" onClick={() => setEditing(doctor)} aria-label={`Edit ${doctor.name}`} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-white">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => setPendingDelete(doctor)} aria-label={`Remove ${doctor.name}`} className="grid h-9 w-9 place-items-center rounded-lg border border-danger-200 text-danger-600 transition-colors hover:bg-danger-50">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {creating && (
        <DoctorForm
          open
          onClose={() => setCreating(false)}
          initial={BLANK}
          departments={departments}
          onSave={handleCreate}
          title="Add a doctor"
        />
      )}

      {editing && (
        <DoctorForm
          open
          onClose={() => setEditing(null)}
          initial={{
            ...editing,
            experience: String(editing.experience ?? ''),
            fee: String(editing.fee ?? ''),
            slotMinutes: editing.slotMinutes ? String(editing.slotMinutes) : '',
            languages: (editing.languages || []).join(', '),
          }}
          departments={departments}
          onSave={handleUpdate}
          title={`Edit ${editing.name}`}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          dispatch(removeDoctor(pendingDelete.id));
          dispatch(pushToast(`${pendingDelete.name} removed`, 'info'));
        }}
        title={`Remove ${pendingDelete?.name}?`}
        message="The doctor will disappear from the patient directory. Existing appointments are kept for your records."
        confirmLabel="Remove doctor"
      />
    </section>
  );
}
