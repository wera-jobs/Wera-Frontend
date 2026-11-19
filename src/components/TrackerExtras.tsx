// The tracker's views beyond the board: what's coming up, a list of every
// application, and the archive.
import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import clsx from 'clsx';
import { useJobs, useUpcomingEvents } from '../api/hooks';
import type { AppStatus, Job } from '../api/types';
import { eventKindLabel, whenText } from '../lib/events';
import { relTime } from '../lib/format';
import { StatusSelect } from './StatusSelect';
import { CompanyLogo } from './CompanyLogo';
import { EmptyState, Skeleton } from './States';

/** The next step on a card or row: what, and when, overdue in red. */
export function NextStep({ job, className }: { job: Pick<Job, 'next_step' | 'next_step_at'>; className?: string }) {
  const [now] = useState(() => Date.now());
  if (!job.next_step && !job.next_step_at) return null;
  const due = job.next_step_at ? new Date(job.next_step_at).getTime() : null;
  const late = due != null && due < now;
  return (
    <div className={clsx('truncate text-[11px]', late ? 'text-bad' : 'text-muted', className)}>
      <span className="font-medium">Next:</span> {job.next_step || 'Next step'}
      {job.next_step_at && <span>{` · ${late ? 'was due ' : ''}${whenText(job.next_step_at, false)}`}</span>}
    </div>
  );
}

/** Interviews and other dated steps over the next two weeks, soonest first. */
export function Upcoming({ onOpen }: { onOpen: (id: number) => void }) {
  const { data } = useUpcomingEvents(14);
  const events = data?.events ?? [];
  if (events.length === 0) return null;
  return (
    <section aria-label="Coming up" className="flex items-start gap-3 rounded-card border border-border bg-surface p-3">
      <CalendarClock className="mt-0.5 size-4 shrink-0 text-accent" />
      <div className="flex min-w-0 flex-1 flex-wrap gap-2">
        {events.slice(0, 6).map((ev) => (
          <button
            key={ev.id}
            type="button"
            onClick={() => onOpen(ev.job_id)}
            className="min-w-0 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-left text-xs transition-colors hover:border-accent/40"
          >
            <span className="font-medium text-text">{eventKindLabel(ev.kind)}</span>
            <span className="text-muted">{` · ${ev.company} · ${whenText(ev.at)}`}</span>
          </button>
        ))}
        {events.length > 6 && <span className="self-center text-xs text-faint">and {events.length - 6} more</span>}
      </div>
    </section>
  );
}

const STATUS_ORDER: AppStatus[] = ['offer', 'interviewing', 'applied', 'saved', 'rejected', 'not_interested'];

/**
 * Every application in one table: due next steps first, then by stage.
 * Shares each column's query with the board, so switching views loads
 * nothing new.
 */
export function TrackerList({
  statuses,
  matches,
  onOpen,
  onStatus,
}: {
  statuses: AppStatus[];
  matches: (job: Job) => boolean;
  onOpen: (id: number) => void;
  onStatus: (id: number, status: AppStatus) => void;
}) {
  const results = statuses.map((status) => useJobs({ status, limit: 100, sort: 'newest' })); // eslint-disable-line react-hooks/rules-of-hooks -- fixed list
  if (results.some((r) => r.isLoading)) return <Skeleton className="h-40 w-full" />;
  const due = (j: Job) => (j.next_step_at ? new Date(j.next_step_at).getTime() : Infinity);
  const jobs = results
    .flatMap((r) => r.data?.jobs ?? [])
    .filter(matches)
    .sort(
      (a, b) =>
        due(a) - due(b) ||
        STATUS_ORDER.indexOf(a.application_status ?? 'saved') - STATUS_ORDER.indexOf(b.application_status ?? 'saved'),
    );
  return <Rows jobs={jobs} empty="No applications match." onOpen={onOpen} onStatus={onStatus} />;
}

/** Archived applications: off the board, history kept; restore from the job view. */
export function ArchivedList({
  matches,
  onOpen,
  onStatus,
}: {
  matches: (job: Job) => boolean;
  onOpen: (id: number) => void;
  onStatus: (id: number, status: AppStatus) => void;
}) {
  const { data, isLoading } = useJobs({ archived: 1, limit: 200, sort: 'newest' });
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  const jobs = (data?.jobs ?? []).filter(matches);
  return <Rows jobs={jobs} empty="Nothing archived. Archive an application from its job view to clear it off the board." onOpen={onOpen} onStatus={onStatus} />;
}

function Rows({ jobs, empty, onOpen, onStatus }: { jobs: Job[]; empty: string; onOpen: (id: number) => void; onStatus: (id: number, status: AppStatus) => void }) {
  if (jobs.length === 0) return <EmptyState title={empty} />;
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <table className="w-full table-fixed text-left text-xs">
        <thead className="border-b border-border text-[11px] text-faint">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Role</th>
            <th scope="col" className="hidden w-40 px-3 py-2 font-medium sm:table-cell">Status</th>
            <th scope="col" className="hidden px-3 py-2 font-medium md:table-cell">Next step</th>
            <th scope="col" className="hidden w-28 px-3 py-2 font-medium lg:table-cell">Found</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="border-b border-border last:border-0 hover:bg-surface-2/60">
              <td className="px-3 py-2">
                <button type="button" onClick={() => onOpen(job.id)} className="block w-full min-w-0 text-left">
                  <span className="block truncate font-medium text-text">{job.title}</span>
                  <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-muted">
                    <CompanyLogo name={job.company} url={job.logo_url} />
                    <span className="truncate">{job.company}</span>
                  </span>
                </button>
                <NextStep job={job} className="md:hidden" />
              </td>
              <td className="hidden px-3 py-2 sm:table-cell">
                <StatusSelect value={job.application_status} onChange={(s) => onStatus(job.id, s)} label={`Status for ${job.title}`} />
              </td>
              <td className="hidden px-3 py-2 md:table-cell">
                <NextStep job={job} />
              </td>
              <td className="hidden px-3 py-2 text-faint lg:table-cell">{relTime(job.first_seen_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
