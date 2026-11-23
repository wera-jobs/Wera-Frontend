import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useJobs, useSettings, useStatusWithUndo } from '../api/hooks';
import { FilterBar, type FilterValues } from '../components/FilterBar';
import { JobCard } from '../components/JobCard';
import { JobDrawer } from '../components/JobDrawer';
import { JobRow } from '../components/JobRow';
import { EmptyState, ErrorState, SkeletonRows } from '../components/States';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { stepId } from '../lib/format';
import { handOffJob } from '../lib/extension';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { AddJobDialog } from '../components/AddJobDialog';
import { SavedSearchBar } from '../components/SavedSearches';
import { BulkBar } from '../components/BulkBar';

const PAGE = 50;

function valuesFromParams(sp: URLSearchParams, defaultSort: string): FilterValues {
  return {
    q: sp.get('q') ?? '',
    industry: sp.get('industry') ?? '',
    category: sp.get('category') ?? '',
    min_score: Number(sp.get('min_score') ?? 0) || 0,
    min_pay: Number(sp.get('min_pay') ?? 0) || 0,
    sponsorship: sp.get('sponsorship') ?? '',
    work_mode: sp.get('work_mode') ?? '',
    status: sp.get('status') ?? '',
    posted_within: Number(sp.get('posted_within') ?? 0) || 0,
    sort: (sp.get('sort') ?? defaultSort) === 'newest' ? 'newest' : 'score',
  };
}

export default function JobsPage() {
  useDocumentTitle('Jobs');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const routeId = useParams<{ id?: string }>().id;

  const settings = useSettings();
  const values = valuesFromParams(searchParams, settings.data?.default_sort ?? 'score');
  const offset = Number(searchParams.get('offset') ?? 0) || 0;

  const params = useMemo(
    () => ({ ...values, limit: PAGE, offset }),
    [values, offset],
  );
  const { data, isLoading, error, refetch, isFetching } = useJobs(params);

  const jobs = useMemo(() => data?.jobs ?? [], [data]);
  const drawerId = Number(searchParams.get('job') ?? routeId ?? '') || null;

  const [adding, setAdding] = useState(false);
  const [sel, setSel] = useState(0);
  // The filters and page, not the open job: closing the drawer keeps the selection where it was.
  const query = (() => {
    const sp = new URLSearchParams(searchParams);
    sp.delete('job');
    sp.delete('tab');
    return sp.toString();
  })();
  // The row a shift-click range starts from (see toggle below).
  const [anchor, setAnchor] = useState<number | null>(null);
  const [selQuery, setSelQuery] = useState(query);
  if (selQuery !== query) {
    // New filters or page: the selection starts at the top, and a range
    // can't start from a row of the old list.
    setSelQuery(query);
    setSel(0);
    setAnchor(null);
  }

  const patchParams = useCallback(
    (patch: Record<string, string | number>, opts?: { keepOffset?: boolean }) => {
      setSearchParams(
        (sp) => {
          const next = new URLSearchParams(sp);
          for (const [k, v] of Object.entries(patch)) {
            if (v === '' || v === 0) next.delete(k);
            else next.set(k, String(v));
          }
          if (!opts?.keepOffset) next.delete('offset');
          next.delete('job'); // filters changing invalidates the open drawer
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const openDrawer = useCallback(
    (id: number) => {
      setSearchParams(
        (sp) => {
          const next = new URLSearchParams(sp);
          next.set('job', String(id));
          next.delete('tab'); // another job opens on its posting
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const closeDrawer = useCallback(() => {
    if (routeId) {
      void navigate('/jobs', { replace: true });
    } else {
      setSearchParams(
        (sp) => {
          const next = new URLSearchParams(sp);
          next.delete('job');
          next.delete('tab');
          return next;
        },
        { replace: true },
      );
    }
  }, [routeId, navigate, setSearchParams]);

  const quickStatus = useStatusWithUndo();

  // Jobs picked for a bulk action (ids, so a refetch keeps them); shift-click picks a range.
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const picked = jobs.filter((j) => checked.has(j.id));
  const toggle = useCallback(
    (i: number, range = false) => {
      const next = new Set(checked);
      const on = !checked.has(jobs[i].id);
      const [from, to] = range && anchor != null ? [Math.min(anchor, i), Math.max(anchor, i)] : [i, i];
      // A refetch can shorten the list under an old anchor: stay inside it.
      for (let k = from; k <= Math.min(to, jobs.length - 1); k++) {
        if (on) next.add(jobs[k].id);
        else next.delete(jobs[k].id);
      }
      setChecked(next);
      setAnchor(i);
    },
    [checked, anchor, jobs],
  );
  const allOnPage = jobs.length > 0 && picked.length === jobs.length;

  // Keyboard: j/k move the cursor, Enter opens, o opens the posting, x selects for a bulk action.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'A') return;
      // While the drawer or a dialog is open it owns the keyboard (esc, o).
      if (drawerId != null || adding) return;
      if (e.key === 'j' || e.key === 'k') {
        e.preventDefault();
        setSel((s) => {
          const next = e.key === 'j' ? s + 1 : s - 1;
          return Math.min(Math.max(next, 0), Math.max(jobs.length - 1, 0));
        });
      } else if (e.key === 'Enter') {
        const job = jobs[sel];
        if (job) openDrawer(job.id);
      } else if (e.key === 'x') {
        if (jobs[sel]) toggle(sel);
      } else if (e.key === 'o') {
        const job = jobs[sel];
        if (job) {
          handOffJob(job.id, job.url);
          window.open(job.url, '_blank', 'noopener');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jobs, sel, openDrawer, drawerId, adding, toggle]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold">Jobs</h1>
          <p className="mt-1 text-xs text-muted">
            {isFetching ? 'Loading…' : `${jobs.length} shown${jobs.length === PAGE ? '+' : ''}`}
            <span className="hidden md:inline">
              {' '}· <span className="font-mono">j/k</span> to move · <span className="font-mono">Enter</span>{' '}
              opens · <span className="font-mono">o</span> opens posting · <span className="font-mono">x</span> selects
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 self-end">
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg transition-colors hover:bg-accent/85"
          >
            <Plus className="size-3.5" /> Add job
          </button>
        </div>
      </header>

      <BulkBar jobs={picked} onDone={() => setChecked(new Set())} />

      {adding && (
        <AddJobDialog
          onClose={() => setAdding(false)}
          onAdded={(id) => {
            setAdding(false);
            openDrawer(id);
          }}
        />
      )}

      <SavedSearchBar />

      <FilterBar
        values={values}
        onChange={(patch) => patchParams(patch)}
        onReset={() => {
          const next = new URLSearchParams();
          setSearchParams(next, { replace: true });
          void refetch();
        }}
      />

      {isLoading ? (
        <SkeletonRows rows={8} />
      ) : error && !data ? (
        <ErrorState
          message={error instanceof Error ? error.message : 'unknown error'}
          onRetry={() => void refetch()}
        />
      ) : jobs.length === 0 ? (
        <EmptyState
          title="No jobs match these filters"
          hint="Try loosening the score minimum or clearing filters."
        />
      ) : (
        <>
          {/* Dense table (>=640px) */}
          <div className="overflow-x-auto rounded-card border border-border bg-surface">
            {/* Lower-priority columns (industry, mode, first seen) appear on wide screens. */}
            <table className="hidden w-full min-w-[720px] sm:table">
              <thead>
                <tr className="border-b border-border text-left text-[10px] font-medium tracking-wide text-faint uppercase">
                  <th className="w-8 py-2.5 pl-3">
                    <input
                      type="checkbox"
                      checked={allOnPage}
                      onChange={() => setChecked(allOnPage ? new Set() : new Set(jobs.map((j) => j.id)))}
                      aria-label="Select every job on this page"
                      className="size-3.5 cursor-pointer accent-accent"
                    />
                  </th>
                  <th className="w-14 px-3 py-2.5">Score</th>
                  <th className="px-3 py-2.5">Title</th>
                  <th className="px-3 py-2.5">Company</th>
                  <th className="hidden px-3 py-2.5 2xl:table-cell">Industry</th>
                  <th className="px-3 py-2.5">Location</th>
                  <th className="hidden px-3 py-2.5 xl:table-cell">Pay</th>
                  <th className="hidden px-3 py-2.5 2xl:table-cell">Mode</th>
                  <th className="px-3 py-2.5">Sponsorship</th>
                  <th className="hidden px-3 py-2.5 2xl:table-cell">Posted</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, i) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    index={i}
                    selected={i === sel}
                    checked={checked.has(job.id)}
                    onCheck={(range) => toggle(i, range)}
                    onOpen={openDrawer}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Stacked cards (<640px) */}
          <div className="grid gap-2.5 sm:hidden">
            {jobs.map((job, i) => (
              <JobCard
                key={job.id}
                job={job}
                index={i}
                onOpen={openDrawer}
                onQuickStatus={quickStatus}
                quickActions={false}
                checked={checked.has(job.id)}
                onCheck={() => toggle(i)}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <button
              disabled={offset === 0}
              onClick={() => patchParams({ offset: Math.max(offset - PAGE, 0) }, { keepOffset: true })}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors duration-150 hover:border-accent/40 hover:text-text disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" /> Previous
            </button>
            <span className="font-mono text-xs text-faint">
              {offset + 1}–{offset + jobs.length}
            </span>
            <button
              disabled={jobs.length < PAGE}
              onClick={() => patchParams({ offset: offset + PAGE }, { keepOffset: true })}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors duration-150 hover:border-accent/40 hover:text-text disabled:opacity-40"
            >
              Next <ChevronRight className="size-3.5" />
            </button>
          </div>
        </>
      )}

      {drawerId != null && (
        <JobDrawer
          jobId={drawerId}
          onClose={closeDrawer}
          initialTab={searchParams.get('tab') === 'prep' ? 'prep' : 'posting'}
          onNavigate={(dir) => {
            const next = stepId(jobs.map((j) => j.id), drawerId, dir);
            if (next != null) {
              setSel(jobs.findIndex((j) => j.id === next));
              openDrawer(next);
            }
          }}
        />
      )}
    </div>
  );
}

