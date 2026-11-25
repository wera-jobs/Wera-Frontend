import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Bookmark, BookmarkCheck, ExternalLink, LoaderCircle, Sun, Target, X } from 'lucide-react';
import { useLatestRun, useStats, useStatusWithUndo, useToday } from '../api/hooks';
import { useProfile } from '../api/profile';
import type { AppStatus, Job } from '../api/types';
import { ExtensionPromo } from '../components/ExtensionPromo';
import { CompanyLogo } from '../components/CompanyLogo';
import { TuneSuggestions } from '../components/TuneSuggestions';
import { CHIP_BUTTON, JobCard } from '../components/JobCard';
import { JobDrawer } from '../components/JobDrawer';
import { ScoreRing } from '../components/ScoreRing';
import { StatTile } from '../components/StatTile';
import { EarlyBadge, OLD_POSTING_DAYS, OldPostingBadge, PostedAge, StatusPill } from '../components/JobBadges';
import { EmptyState, ErrorState, SkeletonRows } from '../components/States';
import { daysUp, jobMeta, relTime, stepId, toYou } from '../lib/format';
import { useWeeklyGoal } from '../lib/goals';
import { useDocumentTitle } from '../lib/useDocumentTitle';

/** How many jobs Today shows at first, and how many more each "Show more" adds. */
const PAGE = 20;

/** What the tiles filter Today's list to. */
type TodayFilter = 'new' | 'strong' | 'sponsors';

const DAY_MS = 24 * 60 * 60_000;
/** The most jobs /api/today returns; at the cap there are more. */
const TODAY_CAP = 100;

const WITHIN: [number, string][] = [
  [0, 'Any time'],
  [1, '24 hours'],
  [3, '3 days'],
  [7, 'Week'],
];

const FILTERS: Record<TodayFilter, { test: (j: Job, now: number) => boolean; empty: string; label: string }> = {
  new: { test: (j, now) => now - new Date(j.first_seen_at).getTime() < DAY_MS, label: 'new in the last 24 hours', empty: 'No match to review came in the last 24 hours.' },
  strong: { test: (j) => (j.fit_score ?? 0) >= 80, label: 'strong fits (80+)', empty: 'No strong fit (80+) to review right now.' },
  sponsors: { test: (j) => j.sponsorship === 'yes', label: 'jobs that sponsor visas', empty: 'No job that sponsors visas to review right now.' },
};

/** Today's best job, presented large above the list. */
function TopPick({ job, passedOver, onOpen, onStatus }: { job: Job; passedOver: number; onOpen: (id: number) => void; onStatus: (job: Job, status: AppStatus | null) => void }) {
  const meta = jobMeta(job);
  const saved = job.application_status === 'saved';
  return (
    <article className="anim-rise group relative cursor-pointer rounded-card border border-accent/25 bg-surface p-5 transition-colors duration-150 hover:border-accent/50 has-[h2_button:focus-visible]:ring-2 has-[h2_button:focus-visible]:ring-accent">
      <div className="flex flex-wrap items-start gap-4 sm:gap-5">
        <span className="sm:hidden">
          <ScoreRing score={job.fit_score} estimate={job.estimated_score} ai={job.estimate_ai} size="md" />
        </span>
        <span className="hidden sm:block">
          <ScoreRing score={job.fit_score} estimate={job.estimated_score} ai={job.estimate_ai} size="lg" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold tracking-widest text-accent uppercase">
              {job.fit_score == null ? 'Top estimate' : 'Top pick'}
            </span>
            <StatusPill value={job.application_status} />
            <EarlyBadge job={job} />
            <OldPostingBadge job={job} />
          </div>
          <h2 className="mt-1.5 line-clamp-2 text-lg leading-snug font-semibold text-text">
            <button
              type="button"
              onClick={() => onOpen(job.id)}
              aria-label={`Top pick: ${job.title} at ${job.company}`}
              className="stretched text-left outline-none"
            >
              {job.title}
            </button>
          </h2>
          <div className="mt-0.5 flex min-w-0 items-center gap-2 text-sm text-muted">
            <CompanyLogo name={job.company} url={job.logo_url} size="md" />
            <span className="truncate">{job.company}</span>
          </div>
          {passedOver > 0 && (
            <p className="mt-1 text-[11px] text-faint">
              Best fit among postings from the last {OLD_POSTING_DAYS} days: {passedOver === 1 ? 'a higher score below is' : `${passedOver} higher scores below are`} on older postings, which are often filled.
            </p>
          )}
          {job.reason && <p className="mt-2 line-clamp-3 max-w-2xl text-xs leading-relaxed text-muted">{toYou(job.reason)}</p>}
          <div className="mt-2.5 text-[11px] text-faint">
            {meta || '—'} · <PostedAge job={job} />
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-1.5 whitespace-nowrap sm:w-auto">
          <a
            href={job.url}
            data-wera-job={job.id}
            target="_blank"
            rel="noreferrer"
            className="relative z-10 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg transition-colors duration-150 hover:bg-accent/85"
          >
            <ExternalLink className="size-3.5" /> Open posting
          </a>
          <button
            type="button"
            onClick={() => onStatus(job, saved ? null : 'saved')}
            aria-pressed={saved}
            title={saved ? 'Saved. Click to unsave.' : undefined}
            className={`${CHIP_BUTTON} px-2.5 py-1.5 hover:border-accent/40 hover:text-accent ${saved ? 'border-accent/30 text-accent' : 'text-text'}`}
          >
            {saved ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />} {saved ? 'Saved' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => onStatus(job, 'not_interested')}
            className={`${CHIP_BUTTON} px-2.5 py-1.5 text-muted hover:border-bad/40 hover:text-bad`}
          >
            <Ban className="size-3.5" /> Not interested
          </button>
        </div>
      </div>
    </article>
  );
}

/** The day's new matches against the median day, so a one-off spike (a big import) does not skew it. */
function vsUsual(perDay: { count: number }[]): { text: string; tone: 'good' | 'neutral' } | undefined {
  const before = perDay.slice(0, -1).map((d) => d.count);
  if (before.length < 2 || perDay.length === 0) return undefined;
  const sorted = [...before].sort((x, y) => x - y);
  const mid = sorted.length / 2;
  const usual = sorted.length % 2 ? sorted[Math.floor(mid)] : (sorted[mid - 1] + sorted[mid]) / 2;
  const diff = Math.round(perDay[perDay.length - 1].count - usual);
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '±';
  // Fewer new jobs is not bad news: only more is highlighted.
  return { text: `${sign}${Math.abs(diff).toLocaleString()} vs usual`, tone: diff > 0 ? 'good' : 'neutral' };
}

export default function TodayPage() {
  useDocumentTitle('Today');
  // While matches are still being scored (a new user's first minutes),
  // estimates fill the list and it refreshes as real scores replace them.
  const profile = useProfile();
  const updatedAt = profile.data?.updated_at ?? undefined;
  const { data, isLoading, error, refetch } = useToday(updatedAt);
  const pending = data?.pending ?? 0;
  const ungraded = data?.ungraded ?? 0;
  const [now] = useState(() => Date.now());
  const justSaved = updatedAt != null && now - new Date(updatedAt).getTime() < 3 * 60_000;
  const stats = useStats();
  const latest = useLatestRun();
  const setStatus = useStatusWithUndo();
  const [filter, setFilter] = useState<TodayFilter | null>(null);
  const [within, setWithin] = useState(0);
  const [shown, setShown] = useState(PAGE);
  const [weeklyGoal, setWeeklyGoal] = useWeeklyGoal();
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');
  // The drawer steps through the list as it was when the job was opened,
  // so a job dealt with in the drawer (and gone from Today) keeps its place.
  const [drawer, setDrawer] = useState<{ id: number; ids: number[] } | null>(null);

  // /api/today is the review queue: scored jobs not yet applied to or
  // dismissed (saved ones stay), best fit first, then estimates.
  const all: Job[] = data?.jobs ?? [];
  const estimatedCount = all.filter((j) => j.fit_score == null).length;
  const count = (f: TodayFilter) => all.filter((j) => FILTERS[f].test(j, now)).length;
  const tiled = filter ? all.filter((j) => FILTERS[filter].test(j, now)) : all;
  // How recently the posting went up: under a day, three days, a week (0: any time).
  const jobs = within ? tiled.filter((j) => daysUp(j) < within) : tiled;
  const toggle = (f: TodayFilter) => {
    setFilter((cur) => (cur === f ? null : f));
    setShown(PAGE);
  };
  const open = (id: number) => setDrawer({ id, ids: jobs.map((j) => j.id) });

  // New matches per day in the user's own time zone, most recent last.
  const perDay = stats.data?.new_per_day ?? [];
  const lastRun = latest.data?.runs[0];
  // The top pick leads the full list: the best job still worth applying
  // to, so not one up for months while a fresher one waits. A filtered
  // list is just the list.
  const top = filter || within ? null : (jobs.find((j) => daysUp(j) <= OLD_POSTING_DAYS) ?? jobs[0] ?? null);
  const rest = jobs.filter((j) => j !== top);
  // Older postings that score higher than the top pick: said on the card, so the order explains itself.
  const topScore = top ? (top.fit_score ?? top.estimated_score ?? 0) : 0;
  const passedOver = top ? rest.filter((j) => daysUp(j) > OLD_POSTING_DAYS && (j.fit_score ?? j.estimated_score ?? 0) > topScore).length : 0;
  const visible = rest.slice(0, shown);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold">Today</h1>
          <p className="mt-1 text-xs text-muted">
            {all.length >= TODAY_CAP ? `${TODAY_CAP}+` : all.length} {all.length === 1 ? 'match' : 'matches'} to review
            {estimatedCount > 0 && <> ({estimatedCount} estimated)</>}
            {lastRun && <> · last checked for new jobs {relTime(lastRun.started_at)}</>}
          </p>
        </div>
        <Link to="/review" className="text-xs font-medium text-accent hover:underline">
          Your week in review
        </Link>
      </header>

      {ungraded > 0 && (
        <div className="anim-rise flex items-center gap-3 rounded-card border border-accent-2/25 bg-accent-2/[0.06] px-4 py-3">
          <LoaderCircle className="size-4 shrink-0 animate-spin text-accent-2" />
          <div className="min-w-0 text-xs">
            <span className="font-medium text-text">The AI is grading your matches</span>
            <span className="text-muted">
              {' '}
              · {ungraded.toLocaleString()} to go. The list reorders as grades arrive; open any job to score it in
              full right away.
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        <StatTile
          label="New today"
          value={perDay.length ? perDay[perDay.length - 1].count : count('new')}
          accent
          bars={perDay.length >= 2 ? perDay : undefined}
          delta={vsUsual(perDay)}
          sub={`${count('new')} to review`}
          onClick={() => toggle('new')}
          pressed={filter === 'new'}
        />
        <StatTile label="Strong fits (80+)" value={count('strong')} sub="to review" onClick={() => toggle('strong')} pressed={filter === 'strong'} />
        <StatTile label="Sponsor visas" value={count('sponsors')} sub="to review" onClick={() => toggle('sponsors')} pressed={filter === 'sponsors'} />
        <StatTile
          label="Applied this week"
          value={weeklyGoal > 0 ? `${stats.data?.applications_per_week ?? 0}/${weeklyGoal}` : (stats.data?.applications_per_week ?? '—')}
          sub={weeklyGoal > 0 && (stats.data?.applications_per_week ?? 0) >= weeklyGoal ? 'Weekly goal met' : 'see your tracker'}
          to="/tracker"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Posted within">
          <span className="mr-1 text-muted">Posted</span>
          {WITHIN.map(([days, label]) => (
            <button
              key={days}
              type="button"
              aria-pressed={within === days}
              onClick={() => {
                setWithin(days);
                setShown(PAGE);
              }}
              className={`rounded-full border px-2.5 py-1 font-medium transition-colors ${within === days ? 'border-accent/50 bg-accent/10 text-accent' : 'border-border text-muted hover:text-text'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Weekly application goal progress & quick editor */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 font-medium text-muted">
            <Target className="size-3.5 text-accent" /> Goal
          </span>
          {editingGoal ? (
            <form
              className="flex items-center gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                setWeeklyGoal(Number(goalDraft) || 0);
                setEditingGoal(false);
              }}
            >
              <input
                type="number"
                min={0}
                max={100}
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                aria-label="Weekly application target"
                placeholder="10"
                className="w-16 rounded-md border border-border bg-surface-2 px-2 py-0.5 font-mono text-xs text-text focus:border-accent/60 focus:outline-none"
              />
              <button type="submit" className="rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-bg hover:bg-accent/85">
                Save
              </button>
              <button type="button" onClick={() => setEditingGoal(false)} className="text-muted hover:text-text">
                Cancel
              </button>
            </form>
          ) : weeklyGoal > 0 ? (
            <>
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={(stats.data?.applications_per_week ?? 0) >= weeklyGoal ? 'h-full bg-good transition-all duration-300' : 'h-full bg-accent transition-all duration-300'}
                  style={{ width: `${Math.min(100, Math.round(((stats.data?.applications_per_week ?? 0) / weeklyGoal) * 100))}%` }}
                />
              </div>
              <span className="font-mono text-muted">
                {stats.data?.applications_per_week ?? 0}/{weeklyGoal}
              </span>
              <button
                type="button"
                onClick={() => {
                  setGoalDraft(String(weeklyGoal));
                  setEditingGoal(true);
                }}
                className="text-faint hover:text-text"
              >
                Edit
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setGoalDraft('10');
                setEditingGoal(true);
              }}
              className="rounded-full border border-border px-2.5 py-0.5 font-medium text-muted hover:border-accent/40 hover:text-text"
            >
              Set weekly target
            </button>
          )}
        </div>
      </div>

      {filter && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted" role="status">
          Showing {jobs.length} {FILTERS[filter].label}.
          <button
            type="button"
            onClick={() => toggle(filter)}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2 py-1 font-medium text-text hover:border-accent/40"
          >
            <X className="size-3" /> Show all
          </button>
        </div>
      )}

      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : error && !data ? (
        <ErrorState message={error instanceof Error ? error.message : 'unknown error'} onRetry={() => void refetch()} />
      ) : all.length === 0 && (justSaved || pending > 0) ? (
        <EmptyState
          icon={<LoaderCircle className="size-5 animate-spin text-accent" />}
          title="Scoring your matches"
          hint="Wera is reading every open job that fits your preferences. The best ones appear here as they're scored."
        />
      ) : all.length === 0 ? (
        <EmptyState
          icon={<Sun className="size-5 text-faint" />}
          title="Nothing left to review"
          hint="Every scored job is applied to or dismissed. Wera checks for new postings at 8:00, 12:00 and 17:00 on weekdays."
        />
      ) : jobs.length === 0 && filter ? (
        <EmptyState icon={<Sun className="size-5 text-faint" />} title={FILTERS[filter].empty} />
      ) : jobs.length === 0 && within ? (
        <EmptyState icon={<Sun className="size-5 text-faint" />} title={`Nothing posted in the last ${WITHIN.find(([d]) => d === within)?.[1].toLowerCase()} to review.`} />
      ) : (
        <>
          <TuneSuggestions />
          <ExtensionPromo />
          {top && <TopPick job={top} passedOver={passedOver} onOpen={open} onStatus={setStatus} />}
          {visible.length > 0 && (
            <div className="grid gap-3 xl:grid-cols-2">
              {visible.map((job, i) => (
                <JobCard key={job.id} job={job} index={i % PAGE} onOpen={open} onQuickStatus={setStatus} />
              ))}
            </div>
          )}
          {rest.length > shown ? (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE)}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-medium text-text transition-colors hover:border-accent/40"
              >
                Show {Math.min(PAGE, rest.length - shown)} more
              </button>
              <Link to="/jobs" className="text-xs text-accent hover:underline">
                Browse every match in Jobs
              </Link>
            </div>
          ) : null}
        </>
      )}

      {drawer != null && (
        <JobDrawer
          jobId={drawer.id}
          onClose={() => setDrawer(null)}
          onNavigate={(dir) => {
            const next = stepId(drawer.ids, drawer.id, dir);
            if (next != null) setDrawer({ ...drawer, id: next });
          }}
        />
      )}
    </div>
  );
}
