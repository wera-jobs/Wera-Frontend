// Acting on several jobs at once from the Jobs page: save, mark not
// interested, or hide their companies, with one Undo for the lot.
import { useQueryClient } from '@tanstack/react-query';
import { Ban, Bookmark, EyeOff, X } from 'lucide-react';
import { useState } from 'react';
import { api, errorMessage } from '../api/client';
import type { AppStatus, Job } from '../api/types';
import { announceChange } from '../lib/extension';
import { toast } from '../lib/toast';

const BTN =
  'inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-accent/40 disabled:opacity-50';

const setStatus = (id: number, status: AppStatus | null) =>
  status == null
    ? api(`/api/jobs/${id}/application`, { method: 'DELETE' })
    : api(`/api/jobs/${id}/application`, { method: 'PUT', body: JSON.stringify({ id, status }) });

const setHidden = (companyId: number, hidden: boolean) =>
  api(`/api/companies/${companyId}/hidden`, { method: hidden ? 'PUT' : 'DELETE' });

export function BulkBar({ jobs, onDone }: { jobs: Job[]; onDone: () => void }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  if (jobs.length === 0) return null;
  const companies = [...new Map(jobs.map((j) => [j.company_id, j.company])).entries()];

  const run = async (work: () => Promise<unknown>, done: string, undo: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await work();
      // The extension shows statuses and hidden companies too.
      announceChange('application');
      onDone();
      toast.success(done, {
        label: 'Undo',
        run: () => {
          void undo()
            .then(() => announceChange('application'))
            .catch((err: unknown) => toast.error(`Couldn't undo: ${errorMessage(err, 'network error')}`))
            .finally(() => void qc.invalidateQueries());
        },
      });
    } catch (err) {
      toast.error(`Some changes didn't save: ${errorMessage(err, 'network error')}`);
    } finally {
      setBusy(false);
      void qc.invalidateQueries();
    }
  };

  const mark = (status: AppStatus, word: string) => {
    const before = jobs.map((j) => [j.id, j.application_status ?? null] as const).filter(([, s]) => s !== status);
    if (before.length === 0) {
      // Nothing to change (and nothing to undo): say so instead of "Saved 0 jobs".
      onDone();
      toast.success(`${jobs.length === 1 ? 'That job is' : 'Those jobs are'} already ${word === 'Saved' ? 'saved' : 'marked not interested'}.`);
      return;
    }
    void run(
      () => Promise.all(before.map(([id]) => setStatus(id, status))),
      `${word} ${before.length} ${before.length === 1 ? 'job' : 'jobs'}`,
      () => Promise.all(before.map(([id, s]) => setStatus(id, s))),
    );
  };
  const hide = () =>
    void run(
      () => Promise.all(companies.map(([id]) => setHidden(id, true))),
      `Hid ${companies.length === 1 ? companies[0][1] : `${companies.length} companies`}. Unhide in Settings.`,
      () => Promise.all(companies.map(([id]) => setHidden(id, false))),
    );

  return (
    <div
      role="toolbar"
      aria-label="Selected jobs"
      className="anim-rise fixed inset-x-4 bottom-20 z-40 mx-auto flex max-w-xl flex-wrap items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2.5 shadow-xl lg:bottom-6"
    >
      <span className="mr-auto text-xs font-semibold text-text">{jobs.length} selected</span>
      <button type="button" disabled={busy} onClick={() => mark('saved', 'Saved')} className={BTN}>
        <Bookmark className="size-3.5" /> Save
      </button>
      <button type="button" disabled={busy} onClick={() => mark('not_interested', 'Marked not interested:')} className={BTN}>
        <Ban className="size-3.5" /> Not interested
      </button>
      <button type="button" disabled={busy} onClick={hide} className={BTN}>
        <EyeOff className="size-3.5" /> {companies.length === 1 ? 'Hide company' : `Hide ${companies.length} companies`}
      </button>
      <button type="button" onClick={onDone} aria-label="Clear the selection" className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-text">
        <X className="size-4" />
      </button>
    </div>
  );
}
