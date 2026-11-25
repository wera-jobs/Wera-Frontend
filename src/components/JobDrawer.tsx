import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import {
  Ban,
  Bell,
  BellOff,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  ExternalLink,
  FileText,
  MapPin,
  PenLine,
  X,
} from 'lucide-react';
import { useFollowCompany, useHideCompany, useJob, useScoreJob, useStatusWithUndo, useUpdateApplication } from '../api/hooks';
import { CoverLetterPanel } from './CoverLetterPanel';
import { InterviewPrepPanel } from './InterviewPrepPanel';
import { JobResumePanel } from './JobResumePanel';
import { toast } from '../lib/toast';
import { errorMessage } from '../api/client';
import type { AppStatus, JobDetail } from '../api/types';
import { Description } from './Description';
import { ClosedBadge, IndustryBadge, EarlyBadge, OldPostingBadge, StatusPill } from './JobBadges';
import { CompanyLogo } from './CompanyLogo';
import { ErrorState, Skeleton } from './States';
import { Insights } from './JobInsights';
import { absTime, relTime } from '../lib/format';
import { handOffJob, useExtension } from '../lib/extension';
import { AutofillHistory } from './AutofillHistory';
import { useScrollLock } from '../lib/useScrollLock';

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-faint">
      {children}
    </kbd>
  );
}

export type DrawerTab = 'posting' | 'letter' | 'resume' | 'prep';

function Tabs({ tab, setTab }: { tab: DrawerTab; setTab: (t: DrawerTab) => void }) {
  return (
    <div role="tablist" className="mb-4 flex gap-1 border-b border-border">
      {(
        [
          ['posting', 'The posting'],
          ['letter', 'Cover letter'],
          ['resume', 'Resume'],
          ['prep', 'Interview prep'],
        ] as const
      ).map(([key, label]) => (
        <button
          key={key}
          role="tab"
          aria-selected={tab === key}
          onClick={() => setTab(key)}
          className={clsx(
            '-mb-px border-b-2 px-3 py-2 text-xs font-medium transition-colors duration-150',
            tab === key ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-text',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Right column: the fit analysis, facts, and the user's application. */
function Header({ job, onLeave }: { job: JobDetail; onLeave: () => void }) {
  const location = job.location_summary ?? job.location_raw;
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <IndustryBadge value={job.industry} />
        <StatusPill value={job.application_status} />
        <ClosedBadge at={job.closed_at} />
        <EarlyBadge job={job} />
        <OldPostingBadge job={job} />
      </div>
      <h2 className="mt-2 text-xl leading-snug font-semibold text-balance text-text md:text-2xl">{job.title}</h2>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <CompanyLogo name={job.company} url={job.logo_url} size="md" />
          {/* Closes the view first: on a page that keeps it open (a company's own page), it would stay over the new page. */}
          <Link to={`/companies/${job.company_id}`} onClick={onLeave} className="font-medium text-text hover:text-accent hover:underline">
            {job.company}
          </Link>
          {job.department && <span className="text-faint">· {job.department}</span>}
        </span>
        {location && (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0 text-faint" />
            <span className="truncate" title={location}>
              {location}
            </span>
          </span>
        )}
        {job.posted_at && (
          <span className="inline-flex items-center gap-1.5" title={absTime(job.posted_at)}>
            <CalendarDays className="size-3.5 text-faint" /> Posted {relTime(job.posted_at)}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Full job detail: a wide two-column panel (the posting on the left, the
 * fit analysis and the user's application on the right) that becomes a
 * full-screen sheet on phones. onNavigate, when given, moves to the
 * previous/next job of the list it was opened from.
 */
export function JobDrawer({
  jobId,
  onClose,
  onNavigate,
  initialTab = 'posting',
}: {
  jobId: number;
  onClose: () => void;
  onNavigate?: (dir: -1 | 1) => void;
  /** The tab to open on, such as the interview prep the tracker offers. */
  initialTab?: DrawerTab;
}) {
  const { data: job, isLoading, error, refetch } = useJob(jobId);
  const update = useUpdateApplication();
  const score = useScoreJob();

  // An unscored job gets its AI score the moment it is opened.
  const requested = useRef(new Set<number>());
  useEffect(() => {
    if (job && job.fit_score == null && job.stage === 'pending_score' && !requested.current.has(job.id)) {
      requested.current.add(job.id);
      score.mutate(job.id);
    }
  }, [job, score]);
  const scrollers = useRef<(HTMLElement | null)[]>([]);

  // New job: back to the top of both columns (and, on phones, of the body
  // they stack in), with the keyboard on the posting, so arrows, Page Down
  // and Space scroll it.
  useEffect(() => {
    scrollers.current.forEach((el) => el?.scrollTo({ top: 0 }));
    scrollers.current[0]?.focus({ preventScroll: true });
  }, [jobId]);

  // Esc closes, o opens the posting, arrows move through the list.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest('input, textarea, select');
      if (e.key === 'Escape') onClose();
      if (typing) return;
      if (e.key === 'o' && job?.url) {
        e.preventDefault();
        handOffJob(job.id, job.url);
        window.open(job.url, '_blank', 'noopener');
      }
      if (onNavigate && (e.key === 'ArrowRight' || e.key === 'j')) onNavigate(1);
      if (onNavigate && (e.key === 'ArrowLeft' || e.key === 'k')) onNavigate(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onNavigate, job?.id, job?.url]);

  useScrollLock();

  const setStatus = (status: AppStatus | null) =>
    job && update.mutate({ id: job.id, status, notes: job.application_notes ?? '' });
  const setWithUndo = useStatusWithUndo();
  const extension = useExtension();
  const [tab, setTab] = useState<DrawerTab>(initialTab);
  const [highlightSkills, setHighlightSkills] = useState(true);
  const [tabJob, setTabJob] = useState(jobId);
  const [askedTab, setAskedTab] = useState(initialTab);
  // A tab picked from outside the tab strip (the footer, a link to a tab):
  // on phones the strip sits below the insights, so bring it into view.
  // Each request bumps the count; the effect below handles each one once.
  const [reveals, setReveals] = useState(initialTab !== 'posting' ? 1 : 0);
  const revealed = useRef(0);
  if (tabJob !== jobId) {
    // A different job opens on its posting (or the tab it was opened for).
    setTabJob(jobId);
    setAskedTab(initialTab);
    setTab(initialTab);
    if (initialTab !== 'posting') setReveals((n) => n + 1);
  } else if (askedTab !== initialTab) {
    // Asked again for a tab while open, such as interview prep from a toast.
    setAskedTab(initialTab);
    setTab(initialTab);
    if (initialTab !== 'posting') setReveals((n) => n + 1);
  }
  const showTab = (t: DrawerTab) => {
    setTab(t);
    if (t !== 'posting') setReveals((n) => n + 1);
  };
  const loaded = job != null;
  useEffect(() => {
    if (!loaded || revealed.current === reveals) return;
    revealed.current = reveals;
    // Only where the columns stack: on wider screens the tabs are in view.
    if (window.matchMedia('(max-width: 767px)').matches) scrollers.current[0]?.scrollIntoView({ block: 'start' });
  }, [reveals, loaded]);
  const hide = useHideCompany();
  const follow = useFollowCompany();
  const toggleFollow = () => {
    if (!job) return;
    const next = !job.company_followed;
    follow.mutate(
      { id: job.company_id, follow: next },
      {
        onSuccess: () => toast.success(next ? `Following ${job.company}.` : `Stopped following ${job.company}.`),
        onError: (e: unknown) => toast.error(errorMessage(e)),
      },
    );
  };
  const hideCompany = () => {
    if (!job) return;
    hide.mutate(
      { id: job.company_id, hidden: true },
      {
        onSuccess: () => {
          toast.success(`${job.company} hidden from your matches.`, {
            label: 'Undo',
            run: () => hide.mutate({ id: job.company_id, hidden: false }, { onError: (e: unknown) => toast.error(errorMessage(e)) }),
          });
          onClose();
        },
        onError: (e: unknown) => toast.error(errorMessage(e)),
      },
    );
  };
  const saved = job?.application_status === 'saved';

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center md:p-5 lg:p-8">
      {/* A plain scrim: a blurred one made the posting stutter as it scrolled. */}
      <div className="fade-enter absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={job ? `${job.title} at ${job.company}` : 'Job detail'}
        className="modal-enter relative flex w-full max-w-6xl flex-col overflow-hidden border-border bg-surface shadow-2xl md:rounded-2xl md:border"
      >
        {/* Top bar: header + actions */}
        <div className="flex shrink-0 items-start gap-4 border-b border-border px-5 py-4 md:px-6">
          {job ? (
            <Header job={job} onLeave={onClose} />
          ) : (
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {/* A job you added has no company board to follow or hide. */}
            {job && job.source !== 'manual' && (
              <>
                <button
                  onClick={toggleFollow}
                  disabled={follow.isPending}
                  aria-pressed={!!job.company_followed}
                  aria-label={job.company_followed ? `Unfollow ${job.company}` : `Follow ${job.company}`}
                  title={job.company_followed ? `Following ${job.company}` : `Follow ${job.company} for new roles`}
                  className={clsx(
                    'rounded-lg p-2 transition-colors hover:bg-surface-2',
                    job.company_followed ? 'text-accent' : 'text-muted hover:text-text',
                  )}
                >
                  {job.company_followed ? <BellOff className="size-4" /> : <Bell className="size-4" />}
                </button>
                <button
                  onClick={hideCompany}
                  aria-label={`Hide ${job.company}`}
                  title={`Hide all ${job.company} jobs`}
                  className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-text"
                >
                  <EyeOff className="size-4" />
                </button>
              </>
            )}
            {onNavigate && (
              <>
                <button
                  onClick={() => onNavigate(-1)}
                  aria-label="Previous job"
                  title="Previous (←)"
                  className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-text"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  onClick={() => onNavigate(1)}
                  aria-label="Next job"
                  title="Next (→)"
                  className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-text"
                >
                  <ChevronRight className="size-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              title="Close (Esc)"
              className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Body: posting | insights (stacked on phones, insights first) */}
        <div
          ref={(el) => {
            scrollers.current[2] = el;
          }}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain md:grid md:grid-cols-[minmax(0,1fr)_360px] md:overflow-hidden lg:grid-cols-[minmax(0,1fr)_400px]"
        >
          <div
            ref={(el) => {
              scrollers.current[0] = el;
            }}
            tabIndex={-1}
            aria-label="The posting"
            className="order-2 px-5 py-5 outline-none md:order-1 md:overflow-y-auto md:overscroll-contain md:px-8 md:py-6"
          >
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} className={clsx('h-3', i % 3 === 2 ? 'w-2/3' : 'w-full')} />
                ))}
              </div>
            ) : error ? (
              <ErrorState message={`Couldn't load this job: ${errorMessage(error)}`} onRetry={() => void refetch()} />
            ) : job ? (
              <>
                {/* Every tab, even for a posting without a description. */}
                <Tabs tab={tab} setTab={setTab} />
                {/* Keyed by job: stepping to the next job starts each panel
                    fresh, so an open editor can't save into the wrong job. */}
                {tab === 'resume' ? (
                  <JobResumePanel key={job.id} job={job} />
                ) : tab === 'prep' ? (
                  <InterviewPrepPanel key={job.id} job={job} />
                ) : tab === 'letter' ? (
                  <CoverLetterPanel key={job.id} job={job} />
                ) : job.description ? (
                  <>
                    {((job.skills_matched?.length ?? 0) > 0 || (job.skills_missing?.length ?? 0) > 0) && (
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-2/50 px-3 py-1.5 text-[11px]">
                        <div className="flex flex-wrap items-center gap-3 text-muted">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-good" />
                            {job.skills_matched?.length ?? 0} matched
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-warn" />
                            {job.skills_missing?.length ?? 0} missing
                          </span>
                        </div>
                        <button
                          type="button"
                          aria-pressed={highlightSkills}
                          onClick={() => setHighlightSkills((v) => !v)}
                          className={clsx(
                            'rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors',
                            highlightSkills ? 'border-accent/40 bg-accent/10 text-accent' : 'border-border text-muted hover:text-text',
                          )}
                        >
                          {highlightSkills ? 'Highlights on' : 'Highlight skills'}
                        </button>
                      </div>
                    )}
                    <Description
                      text={job.description}
                      matched={job.skills_matched ?? []}
                      missing={job.skills_missing ?? []}
                      highlight={highlightSkills}
                    />
                  </>
                ) : (
                  <p className="text-sm text-muted">
                    This board didn't include a description. Read it on the{' '}
                    <a href={job.url} data-wera-job={job.id} target="_blank" rel="noreferrer" className="text-accent-2 underline decoration-current/40 underline-offset-2 hover:decoration-current">
                      original posting
                    </a>
                    .
                  </p>
                )}
              </>
            ) : null}
          </div>
          <aside
            ref={(el) => {
              scrollers.current[1] = el;
            }}
            className="order-1 border-border bg-surface-2/35 md:order-2 md:overflow-y-auto md:overscroll-contain md:border-l"
          >
            {job ? (
              <>
                <Insights key={job.id} job={job} scoring={score.isPending && score.variables === job.id} />
                <AutofillHistory jobId={job.id} />
              </>
            ) : isLoading ? (
              <Skeleton className="m-5 h-40" />
            ) : null}
          </aside>
        </div>

        {/* Action bar */}
        {job && (
          <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border bg-surface px-5 py-3 md:px-6">
            <a
              href={job.url}
              data-wera-job={job.id}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-bg transition-colors duration-150 hover:bg-accent/85"
            >
              <ExternalLink className="size-3.5" /> {job.closed_at ? `See it on ${job.company}'s site` : `Apply on ${job.company}'s site`}
              {!job.closed_at && extension && <span className="font-normal opacity-80">· Wera fills it</span>}
            </a>
            <button
              onClick={() => setStatus(saved ? null : 'saved')}
              aria-pressed={saved}
              title={saved ? 'Saved. Click to unsave.' : undefined}
              className={`inline-flex items-center gap-1.5 rounded-lg border bg-surface-2 px-3 py-2 text-xs font-medium transition-colors duration-150 hover:border-accent/40 hover:text-accent ${saved ? 'border-accent/30 text-accent' : 'border-border text-text'}`}
            >
              {saved ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />}
              {saved ? 'Saved' : 'Save'}
            </button>
            <button
              onClick={() => showTab(tab === 'letter' ? 'posting' : 'letter')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text transition-colors duration-150 hover:border-accent/40 hover:text-accent"
            >
              {tab === 'letter' ? <FileText className="size-3.5" /> : <PenLine className="size-3.5" />}
              {tab === 'letter' ? 'Back to posting' : 'Cover letter'}
            </button>
            <button
              onClick={() => job && setWithUndo(job, 'not_interested')}
              disabled={job.application_status === 'not_interested'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-muted transition-colors duration-150 hover:border-bad/40 hover:text-bad disabled:cursor-default disabled:opacity-50"
            >
              <Ban className="size-3.5" /> Not interested
            </button>
            <span className="ml-auto hidden items-center gap-2 text-[10px] text-faint lg:flex">
              <Kbd>o</Kbd> open
              {onNavigate && (
                <>
                  · <Kbd>←</Kbd>
                  <Kbd>→</Kbd> browse
                </>
              )}
              · <Kbd>esc</Kbd> close
            </span>
          </footer>
        )}
      </div>
    </div>
  );
}
