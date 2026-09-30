import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FolderPlus, Layers, Pencil, Sparkles, Trash2, Users, X } from 'lucide-react';

import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';
import { EmptyState, Toggle } from '../common/Bits';
import { ACCENT_OPTIONS, DEPARTMENT_GROUPS, ICON_OPTIONS, resolveAccent, resolveIcon } from '../../utils/icons';
import {
  addDepartment,
  removeDepartment,
  selectDepartments,
  selectDoctorCountByDepartment,
  updateDepartment,
} from '../../store/departmentsSlice';
import { unassignDepartment } from '../../store/doctorsSlice';
import { pushToast } from '../../store/uiSlice';

const BLANK = { name: '', group: 'Adult', icon: 'Stethoscope', accent: 'blue', description: '', services: [], isNew: false };

function DepartmentForm({ open, onClose, initial, onSave, title }) {
  const [values, setValues] = useState(initial);
  const [serviceDraft, setServiceDraft] = useState('');
  const [errors, setErrors] = useState({});

  const set = (field) => (event) => setValues((prev) => ({ ...prev, [field]: event.target.value }));

  const addService = () => {
    const next = serviceDraft.trim();
    if (!next || values.services.includes(next)) return;
    setValues((prev) => ({ ...prev, services: [...prev.services, next] }));
    setServiceDraft('');
  };

  const submit = (event) => {
    event.preventDefault();
    const found = {};
    if (!values.name.trim()) found.name = 'Department name is required.';
    if (!values.description.trim()) found.description = 'Add a short description for patients.';
    setErrors(found);
    if (Object.keys(found).length) return;
    onSave(values);
    onClose();
  };

  const Icon = resolveIcon(values.icon);
  const accent = resolveAccent(values.accent);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle="Appears in the department explorer and booking flow"
      closeOnBackdrop={false}
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" form="dept-form" className="btn-primary flex-1">Save department</button>
        </div>
      }
    >
      <form id="dept-form" onSubmit={submit} noValidate className="space-y-4">
        {/* Live preview */}
        <div className="flex items-center gap-3.5 rounded-2xl bg-slate-50 p-3.5">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${accent.icon}`}>
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{values.name || 'New department'}</p>
            <p className="line-clamp-2 text-[12.5px] text-slate-500">{values.description || 'Short patient-facing description'}</p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="dept-name">Department name *</label>
          <input id="dept-name" className={`input ${errors.name ? 'input-error' : ''}`} value={values.name} onChange={set('name')} placeholder="e.g. Dermatology" />
          {errors.name && <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.name}</p>}
        </div>

        <div>
          <label className="label" htmlFor="dept-desc">Description *</label>
          <textarea id="dept-desc" rows={2} maxLength={220} className={`textarea ${errors.description ? 'input-error' : ''}`} value={values.description} onChange={set('description')} placeholder="What this department treats, in one or two lines." />
          {errors.description && <p className="mt-1.5 text-[12.5px] font-medium text-danger-600">{errors.description}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="dept-group">Group</label>
            <select id="dept-group" className="select" value={values.group || 'Adult'} onChange={set('group')}>
              {DEPARTMENT_GROUPS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <p className="mt-1.5 text-[12px] text-slate-500">Controls which tab the department appears under.</p>
          </div>

          <div>
            <label className="label" htmlFor="dept-icon">Icon</label>
            <select id="dept-icon" className="select" value={values.icon} onChange={set('icon')}>
              {ICON_OPTIONS.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <span className="label">Accent colour</span>
            <div className="flex flex-wrap gap-2">
              {ACCENT_OPTIONS.map((key) => {
                const option = resolveAccent(key);
                const on = values.accent === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setValues((prev) => ({ ...prev, accent: key }))}
                    aria-label={`${key} accent`}
                    aria-pressed={on}
                    className={`grid h-11 w-11 place-items-center rounded-xl transition-all duration-200 ${option.icon} ${
                      on ? 'ring-2 ring-slate-900 ring-offset-2' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <span className="label">Services offered</span>
          <div className="flex gap-2">
            <input
              value={serviceDraft}
              onChange={(e) => setServiceDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addService();
                }
              }}
              className="input"
              placeholder="Add a service and press Enter"
              aria-label="Add a service"
            />
            <button type="button" onClick={addService} className="btn-secondary shrink-0 !px-4">Add</button>
          </div>

          {Boolean(values.services.length) && (
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {values.services.map((service) => (
                <li key={service} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-[12.5px] font-semibold text-slate-700">
                  {service}
                  <button
                    type="button"
                    onClick={() => setValues((prev) => ({ ...prev, services: prev.services.filter((s) => s !== service) }))}
                    aria-label={`Remove ${service}`}
                    className="grid h-6 w-6 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl bg-slate-50 p-3.5">
          <Toggle
            id="dept-new"
            checked={values.isNew}
            onChange={(next) => setValues((prev) => ({ ...prev, isNew: next }))}
            label="Highlight as newly launched"
            description="Shows a green “New” badge on the department card."
          />
        </div>
      </form>
    </Modal>
  );
}

export default function DepartmentManager() {
  const dispatch = useDispatch();
  const departments = useSelector(selectDepartments);
  const counts = useSelector(selectDoctorCountByDepartment);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  return (
    <section>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl">Departments</h2>
          <p className="mt-0.5 text-[13.5px] text-slate-500">{departments.length} specialities published</p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="btn-primary btn-sm">
          <FolderPlus className="h-4 w-4" aria-hidden="true" />
          Add department
        </button>
      </header>

      {!departments.length ? (
        <EmptyState icon={Layers} title="No departments yet" description="Add your first speciality so patients can start booking." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {departments.map((department) => {
            const Icon = resolveIcon(department.icon);
            const accent = resolveAccent(department.accent);
            const count = counts[department.id] || 0;

            return (
              <li key={department.id} className="card p-4">
                <div className="flex items-start gap-3.5">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${accent.icon}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-semibold leading-snug text-slate-900">{department.name}</p>
                      {department.isNew && (
                        <span className="badge bg-mint-100 text-mint-700">
                          <Sparkles className="h-3 w-3" aria-hidden="true" />New
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-slate-500">{department.description}</p>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-bold text-slate-500">
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      {count} {count === 1 ? 'doctor' : 'doctors'}
                      {Boolean(department.services?.length) && <span className="text-slate-300">·</span>}
                      {Boolean(department.services?.length) && <span>{department.services.length} services</span>}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col gap-1.5">
                    <button type="button" onClick={() => setEditing(department)} aria-label={`Edit ${department.name}`} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setPendingDelete(department)} aria-label={`Delete ${department.name}`} className="grid h-9 w-9 place-items-center rounded-lg border border-danger-200 text-danger-600 transition-colors hover:bg-danger-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {creating && (
        <DepartmentForm
          open
          onClose={() => setCreating(false)}
          initial={BLANK}
          title="Add a department"
          onSave={(values) => {
            dispatch(addDepartment(values));
            dispatch(pushToast(`${values.name} added`, 'success'));
          }}
        />
      )}

      {editing && (
        <DepartmentForm
          open
          onClose={() => setEditing(null)}
          initial={{ ...editing, services: editing.services || [] }}
          title={`Edit ${editing.name}`}
          onSave={(values) => {
            dispatch(updateDepartment({ id: editing.id, changes: values }));
            dispatch(pushToast(`${values.name} updated`, 'success'));
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          // Detach doctors first so none are left pointing at a deleted id.
          dispatch(unassignDepartment(pendingDelete.id));
          dispatch(removeDepartment(pendingDelete.id));
          dispatch(pushToast(`${pendingDelete.name} deleted`, 'info'));
        }}
        title={`Delete ${pendingDelete?.name}?`}
        message={
          (counts[pendingDelete?.id] || 0) > 0
            ? `${counts[pendingDelete?.id]} doctor(s) are assigned to this department. They will stay in the directory but become unassigned until you move them.`
            : 'This department will be removed from the explorer and the booking flow.'
        }
        confirmLabel="Delete department"
      />
    </section>
  );
}
