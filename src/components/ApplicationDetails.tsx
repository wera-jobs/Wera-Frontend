// The tracker's details on one application, under its status and notes in
// the job view: the next step and when, the contact, interviews and other
// dated steps, and archiving.
import { useState } from 'react';
import { Archive, ArchiveRestore, CalendarPlus, X } from 'lucide-react';
import { useAddEvent, useDeleteEvent, useJobEvents, usePatchApplication } from '../api/hooks';
import type { Contact, EventKind, JobDetail } from '../api/types';
import { EVENT_KINDS, RESUME_KINDS, eventKindLabel, whenText } from '../lib/events';
import { toast } from '../lib/toast';

// A date input's value (the user's own day) and back. A day-only step is due at 9:00 that morning.
const dayValue = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayISO = (value: string) => (value ? new Date(`${value}T09:00`).toISOString() : '');

const FIELD =
  'rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-text placeholder:text-faint transition-colors hover:border-accent/40 focus:border-accent/60 focus:outline-none';
const INPUT = `w-full ${FIELD}`;
const LABEL = 'mb-1 block text-[11px] text-muted';

export function ApplicationDetails({ job }: { job: JobDetail }) {
  const patch = usePatchApplication();
  const [step, setStep] = useState(job.next_step ?? '');
  const [contact, setContact] = useState<Contact>(job.contact ?? { name: '', role: '', link: '' });
  const saveStep = () => {
    if (step.trim() !== (job.next_step ?? '')) patch.mutate({ id: job.id, next_step: step });
  };
  const saveContact = () => {
    const was = job.contact ?? { name: '', role: '', link: '' };
    if (contact.name === was.name && contact.role === was.role && contact.link === was.link) return;
    const empty = !contact.name.trim() && !contact.role.trim() && !contact.link.trim();
    patch.mutate(empty ? { id: job.id, clear_contact: true } : { id: job.id, contact });
  };
  const archived = !!job.archived_at;

  return (
    <div className="mt-4 space-y-4">
      <div>
        <span className={LABEL} id={`next-${job.id}`}>
          Next step
        </span>
        <div className="flex gap-2">
          <input
            aria-labelledby={`next-${job.id}`}
            value={step}
            onChange={(e) => setStep(e.target.value)}
            onBlur={saveStep}
            onKeyDown={(e) => e.key === 'Enter' && saveStep()}
            maxLength={200}
            placeholder="Follow up with the recruiter"
            className={`min-w-0 flex-1 ${FIELD}`}
          />
          <input
            type="date"
            aria-label="Next step due"
            value={dayValue(job.next_step_at)}
            onChange={(e) => patch.mutate({ id: job.id, next_step_at: dayISO(e.target.value) })}
            className={`w-36 shrink-0 ${FIELD}`}
          />
        </div>
      </div>

      <fieldset>
        <legend className={LABEL}>Contact</legend>
        <div className="grid grid-cols-2 gap-2">
          <input aria-label="Contact name" placeholder="Name" maxLength={200} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} onBlur={saveContact} className={INPUT} />
          <input aria-label="Contact role" placeholder="Recruiter, referrer…" maxLength={200} value={contact.role} onChange={(e) => setContact({ ...contact, role: e.target.value })} onBlur={saveContact} className={INPUT} />
          <input aria-label="Contact email or link" placeholder="Email or LinkedIn" maxLength={200} value={contact.link} onChange={(e) => setContact({ ...contact, link: e.target.value })} onBlur={saveContact} className={`${INPUT} col-span-2`} />
        </div>
      </fieldset>

      <div>
        <span className={LABEL} id={`resume-${job.id}`}>
          Sent with it
          {job.resume_used?.by === 'extension' && <span className="text-faint"> · as the extension attached it</span>}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-labelledby={`resume-${job.id}`}
            value={job.resume_used?.kind ?? ''}
            onChange={(e) => patch.mutate({ id: job.id, resume_kind: e.target.value as '' | 'tailored' | 'base' | 'upload' })}
            className={`w-52 ${FIELD}`}
          >
            <option value="">Resume not recorded</option>
            {RESUME_KINDS.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={!!job.resume_used?.letter}
              onChange={(e) => patch.mutate({ id: job.id, letter_sent: e.target.checked })}
              className="size-3.5 accent-accent"
            />
            Cover letter
          </label>
          {job.resume_used?.name && <span className="min-w-0 truncate text-[11px] text-faint">{job.resume_used.name}</span>}
        </div>
      </div>

      <Events jobId={job.id} />

      <button
        type="button"
        onClick={() =>
          patch.mutate(
            { id: job.id, archived: !archived },
            { onSuccess: () => toast.success(archived ? 'Back on your board.' : 'Archived: off your board, with its history kept.') },
          )
        }
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-text"
      >
        {archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
        {archived ? 'Restore to the board' : 'Archive'}
      </button>
    </div>
  );
}

function Events({ jobId }: { jobId: number }) {
  const { data } = useJobEvents(jobId);
  const add = useAddEvent();
  const del = useDeleteEvent();
  const [adding, setAdding] = useState(false);
  const [at, setAt] = useState('');
  const [kind, setKind] = useState<EventKind>('interview');
  const [withWhom, setWith] = useState('');
  const events = data?.events ?? [];
  const [now] = useState(() => Date.now());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!at) return;
    add.mutate(
      { id: jobId, at: new Date(at).toISOString(), kind, with: withWhom },
      {
        onSuccess: () => {
          setAdding(false);
          setAt('');
          setWith('');
        },
      },
    );
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] text-muted">Interviews and dates</span>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline">
            <CalendarPlus className="size-3.5" /> Add
          </button>
        )}
      </div>
      {events.length > 0 && (
        <ul className="space-y-1.5">
          {events.map((ev) => (
            <li key={ev.id} className={`flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs ${new Date(ev.at).getTime() < now ? 'opacity-60' : ''}`}>
              <span className="font-medium text-text">{eventKindLabel(ev.kind)}</span>
              <span className="text-muted">{whenText(ev.at)}</span>
              {ev.with && <span className="min-w-0 truncate text-faint">with {ev.with}</span>}
              <button
                type="button"
                aria-label={`Delete ${eventKindLabel(ev.kind)} on ${whenText(ev.at)}`}
                onClick={() => del.mutate({ jobId, id: ev.id })}
                className="ml-auto shrink-0 text-faint hover:text-bad"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {events.length === 0 && !adding && <p className="text-xs text-faint">None yet. Add an interview to see it on your tracker and get a reminder.</p>}
      {adding && (
        <form onSubmit={submit} className="mt-1.5 grid grid-cols-2 gap-2 rounded-lg border border-border p-2.5">
          <input type="datetime-local" aria-label="When" required value={at} onChange={(e) => setAt(e.target.value)} className={`${INPUT} col-span-2 sm:col-span-1`} />
          <select aria-label="Kind" value={kind} onChange={(e) => setKind(e.target.value as EventKind)} className={`${INPUT} col-span-2 sm:col-span-1`}>
            {EVENT_KINDS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <input aria-label="With whom" placeholder="With whom (optional)" maxLength={200} value={withWhom} onChange={(e) => setWith(e.target.value)} className={`${INPUT} col-span-2`} />
          <div className="col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} className="rounded-lg px-2.5 py-1.5 text-xs text-muted hover:text-text">
              Cancel
            </button>
            <button type="submit" disabled={add.isPending} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg hover:bg-accent/85 disabled:opacity-60">
              Add
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
