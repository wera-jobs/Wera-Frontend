import { STAGGER_MAX_MS } from '../lib/styles';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { payText, shortLocation, verdictColor, verdictOf } from '../lib/format';
import { IndustryBadge, SponsorshipBadge, StatusPill, WorkModeBadge, AddedBadge, AutofilledBadge, OldPostingBadge, PostedAge } from './JobBadges';
import type { Job } from '../api/types';
import { CompanyLogo } from './CompanyLogo';

/** Dense table row for the Jobs page. */
export function JobRow({
  job,
  index = 0,
  selected,
  checked,
  onCheck,
  onOpen,
}: {
  job: Job;
  /** Position on the page; drives the staggered entrance delay. */
  index?: number;
  /** The keyboard cursor (j/k) is on this row. */
  selected?: boolean;
  /** Picked for a bulk action; with onCheck, the row gets a checkbox. */
  checked?: boolean;
  onCheck?: (range: boolean) => void;
  onOpen: (id: number) => void;
}) {
  const verdict = verdictOf(job.fit_score);
  return (
    <tr
      onClick={() => onOpen(job.id)}
      onKeyDown={(e) => {
        // Keys from the checkbox or a link inside the row are theirs.
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onOpen(job.id);
        }
      }}
      tabIndex={0}
      aria-label={`${job.title} at ${job.company}`}
      className={clsx(
        'anim-rise cursor-pointer border-b border-border/60 transition-colors duration-150 hover:bg-surface-2/60',
        selected && 'bg-accent/5 ring-1 ring-accent/25 ring-inset',
      )}
      style={{ animationDelay: `${Math.min(index * 24, STAGGER_MAX_MS)}ms` }}
    >
      {onCheck && (
        <td className="w-8 py-2.5 pl-3" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={!!checked}
            onChange={() => {}}
            onClick={(e) => onCheck(e.shiftKey)}
            aria-label={`Select ${job.title} at ${job.company}`}
            className="size-3.5 cursor-pointer accent-accent"
          />
        </td>
      )}
      <td className="px-3 py-2.5">
        <span className={clsx('font-mono text-sm font-semibold', verdictColor[verdict])}>
          {job.fit_score ?? (job.estimated_score != null ? (
            <span className="text-faint" title="Estimated; the AI score is on its way">
              ~{job.estimated_score}
            </span>
          ) : (
            '—'
          ))}
        </span>
      </td>
      <td className="max-w-72 px-3 py-2.5 text-sm font-medium text-text">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{job.title}</span>
          <span className="shrink-0 2xl:hidden">
            <OldPostingBadge job={job} />
          </span>
        </span>
      </td>
      <td className="max-w-44 px-3 py-2.5 text-sm text-muted">
        <span className="flex min-w-0 items-center gap-1.5">
          <CompanyLogo name={job.company} url={job.logo_url} />
          <Link to={`/companies/${job.company_id}`} onClick={(e) => e.stopPropagation()} className="truncate hover:text-accent hover:underline">
            {job.company}
          </Link>
          {job.source === 'manual' && <AddedBadge source={job.source} />}
        </span>
      </td>
      <td className="hidden px-3 py-2.5 2xl:table-cell">
        <IndustryBadge value={job.industry} />
      </td>
      <td className="max-w-40 truncate px-3 py-2.5 text-xs text-muted">{shortLocation(job)}</td>
      <td className="hidden px-3 py-2.5 text-xs whitespace-nowrap text-muted xl:table-cell">{payText(job, true) || <span className="text-faint">—</span>}</td>
      <td className="hidden px-3 py-2.5 2xl:table-cell">
        <WorkModeBadge value={job.work_mode} />
      </td>
      <td className="px-3 py-2.5">
        <SponsorshipBadge value={job.sponsorship} />
      </td>
      <td className="hidden px-3 py-2.5 text-xs whitespace-nowrap text-faint 2xl:table-cell">
        <span className="inline-flex items-center gap-1.5">
          <PostedAge job={job} />
          <OldPostingBadge job={job} />
        </span>
      </td>
      <td className="px-3 py-2.5">
        <span className="inline-flex items-center gap-1">
          <StatusPill value={job.application_status} />
          <AutofilledBadge at={job.autofilled_at} />
        </span>
      </td>
    </tr>
  );
}
