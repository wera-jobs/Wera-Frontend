import { Ban, Bookmark, BookmarkCheck, ExternalLink } from 'lucide-react';
import { ScoreRing } from './ScoreRing';
import { Badge } from './Badge';
import { AutofilledBadge, CategoryChips, OldPostingBadge, PostedAge, StatusPill } from './JobBadges';
import { jobMeta, toYou } from '../lib/format';
import type { AppStatus, Job } from '../api/types';

/** The small bordered buttons on cards. */
export const CHIP_BUTTON =
  'relative z-10 inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2 py-1 text-[11px] font-medium transition-colors duration-150';

/**
 * A job in a list. The title is the card's button: it stretches over the
 * whole card, so a click anywhere opens the job, while the links and
 * buttons on it sit above it and stay their own controls.
 */
export function JobCard({
  job,
  index = 0,
  onOpen,
  onQuickStatus,
  quickActions = true,
}: {
  job: Job;
  /** Position in the grid; drives the staggered entrance delay. */
  index?: number;
  onOpen: (id: number) => void;
  onQuickStatus?: (job: Job, status: AppStatus) => void;
  quickActions?: boolean;
}) {
  // One quiet line instead of a wall of badges; the sponsor chip stays
  // because it is the one signal worth interrupting the scan for.
  const meta = jobMeta(job);
  const saved = job.application_status === 'saved';

  return (
    <article
      className="group anim-rise relative min-w-0 cursor-pointer rounded-card border border-border bg-surface p-4 transition-colors duration-150 hover:border-accent/40 has-[h3_button:focus-visible]:ring-2 has-[h3_button:focus-visible]:ring-accent"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      <div className="flex items-start gap-4">
        <ScoreRing score={job.fit_score} estimate={job.estimated_score} ai={job.estimate_ai} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-text">
                <button
                  type="button"
                  onClick={() => onOpen(job.id)}
                  aria-label={`${job.title} at ${job.company}`}
                  className="stretched text-left outline-none"
                >
                  {job.title}
                </button>
              </h3>
              <div className="mt-0.5 truncate text-xs text-muted">{job.company}</div>
            </div>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <StatusPill value={job.application_status} />
              <AutofilledBadge at={job.autofilled_at} />
            </span>
          </div>
          <div className="mt-2 flex min-w-0 items-center gap-2 text-[11px] text-faint">
            <span className="min-w-0 truncate">{meta || '—'}</span>
            <span className="shrink-0">
              · <PostedAge job={job} />
            </span>
            <OldPostingBadge job={job} />
            {job.sponsorship === 'yes' && (
              <Badge variant="good" className="shrink-0">
                Sponsors visas
              </Badge>
            )}
          </div>
          {job.reason && (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{toYou(job.reason)}</p>
          )}
          <div className="mt-2.5 flex min-h-6 flex-wrap items-end justify-between gap-2">
            <CategoryChips cats={job.matched_categories} />
            {quickActions && (
              <div className="ml-auto flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 max-lg:opacity-100">
                <a
                  href={job.url}
                  data-wera-job={job.id}
                  target="_blank"
                  rel="noreferrer"
                  className={`${CHIP_BUTTON} text-text hover:border-accent/40 hover:text-accent`}
                >
                  <ExternalLink className="size-3" /> Open
                </a>
                <button
                  type="button"
                  onClick={() => onQuickStatus?.(job, 'saved')}
                  disabled={saved}
                  aria-label={saved ? 'Saved' : 'Save job'}
                  className={`${CHIP_BUTTON} text-text hover:border-accent/40 hover:text-accent disabled:border-accent/30 disabled:text-accent`}
                >
                  {saved ? <BookmarkCheck className="size-3" /> : <Bookmark className="size-3" />} {saved ? 'Saved' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => onQuickStatus?.(job, 'not_interested')}
                  aria-label="Mark not interested"
                  title="Not interested"
                  className={`${CHIP_BUTTON} text-muted hover:border-bad/40 hover:text-bad`}
                >
                  <Ban className="size-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
