import { Wand2 } from 'lucide-react';
import { Badge, type BadgeVariant } from './Badge';
import { absTime, daysUp, listedAt, relTime } from '../lib/format';
import { IndustryIcon } from './IndustryIcon';
import { useIndustryLabel } from '../api/hooks';
import { useFamilyLabel } from '../api/profile';
import type { AppStatus, Job } from '../api/types';

export function SponsorshipBadge({ value }: { value: Job['sponsorship'] }) {
  if (!value) return null;
  if (value === 'yes') return <Badge variant="good">Sponsors: yes</Badge>;
  if (value === 'no') return <Badge variant="bad">No sponsorship</Badge>;
  // "Unknown" is the common case — keep it quiet instead of warning-yellow.
  return <Badge>Sponsorship unknown</Badge>;
}

/** Marks a job the user saved from a web page with the Chrome extension. */
export function AddedBadge({ source }: { source: string }) {
  if (source !== 'manual') return null;
  return <Badge variant="accent">Added by you</Badge>;
}

/** Marks a job whose application the Chrome extension filled. */
export function AutofilledBadge({ at }: { at?: string | null }) {
  if (!at) return null;
  return (
    <span title={`Filled with the Wera extension ${relTime(at)}`}>
      <Badge variant="accent-2">
        <Wand2 className="size-3" aria-hidden />
        Autofilled
      </Badge>
    </span>
  );
}

/** Marks a job whose posting has come down. It stays tracked, but can no longer be applied to. */
export function ClosedBadge({ at }: { at?: string | null }) {
  if (!at) return null;
  return (
    <span title={`The posting came down ${relTime(at)}`}>
      <Badge variant="neutral">Posting closed</Badge>
    </span>
  );
}

/** Postings up longer than this are marked old: many are filled already. */
export const OLD_POSTING_DAYS = 60;

/** When the posting went up, with when Wera found it on hover. */
export function PostedAge({ job }: { job: Pick<Job, 'posted_at' | 'first_seen_at'> }) {
  const at = listedAt(job);
  const found = at === job.first_seen_at ? '' : `. Wera found it ${absTime(job.first_seen_at)}`;
  return <span title={`Posted ${absTime(at)}${found}`}>{relTime(at)}</span>;
}

/** Marks a posting that has been up for months: often filled already, or kept up for show. */
export function OldPostingBadge({ job }: { job: Pick<Job, 'posted_at' | 'first_seen_at' | 'closed_at'> }) {
  const days = daysUp(job);
  if (days <= OLD_POSTING_DAYS || job.closed_at) return null;
  return (
    <span title={`Up for ${days} days. Postings this old are often filled already.`}>
      <Badge variant="neutral">Old posting</Badge>
    </span>
  );
}

export function WorkModeBadge({ value }: { value: Job['work_mode'] }) {
  if (!value) return null;
  const label = value === 'remote' ? 'Remote' : value === 'hybrid' ? 'Hybrid' : 'Onsite';
  return <Badge>{label}</Badge>;
}

export function IndustryBadge({ value }: { value: string }) {
  const label = useIndustryLabel();
  return (
    <Badge variant="accent-2" className="inline-flex items-center gap-1">
      <IndustryIcon id={value} size="xs" bare />
      {label(value)}
    </Badge>
  );
}

const STATUS_META: Record<AppStatus, { variant: BadgeVariant; label: string }> = {
  saved: { variant: 'accent', label: 'Saved' },
  applied: { variant: 'accent-2', label: 'Applied' },
  interviewing: { variant: 'warn', label: 'Interviewing' },
  offer: { variant: 'good', label: 'Offer' },
  rejected: { variant: 'bad', label: 'Rejected' },
  not_interested: { variant: 'neutral', label: 'Not interested' },
};

export function StatusPill({ value }: { value: AppStatus | null }) {
  if (!value) return null;
  const meta = STATUS_META[value];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function CategoryChips({ cats, className }: { cats: string[]; className?: string }) {
  const label = useFamilyLabel();
  if (cats.length === 0) return null;
  const labels = [...new Set(cats.map(label))];
  return (
    <div className={className}>
      {labels.map((c) => (
        <span
          key={c}
          className="mr-1 mb-1 inline-block rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted"
        >
          {c}
        </span>
      ))}
    </div>
  );
}
