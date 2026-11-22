import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react';
import { api } from '../api/client';
import { StatTile } from '../components/StatTile';
import { ErrorState, SkeletonRows } from '../components/States';
import { useDocumentTitle } from '../lib/useDocumentTitle';

interface Item {
  job_id: number;
  title: string;
  company: string;
  status?: string;
  score?: number | null;
}
interface Review {
  week: string;
  applied: Item[];
  applied_prev: number;
  replies: Item[];
  strong_new: number;
  strong_acted: number;
  strong_best: Item | null;
  waiting: number;
  old_applied: number;
  gaps: { skill: string; count: number }[];
  gaps_of: number;
  suggestions: { text: string; link: string }[];
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const weekLabel = (iso: string) => {
  const from = new Date(iso);
  const to = new Date(from.getTime() + 6 * 86_400_000);
  const f = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${f(from)} to ${f(to)}`;
};
const REPLY: Record<string, string> = { interviewing: 'Interview', offer: 'Offer', rejected: 'Rejected' };

function Jobs({ items, empty }: { items: Item[]; empty: string }) {
  if (!items.length) return <p className="px-4 py-3 text-xs text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-border">
      {items.map((it) => (
        <li key={it.job_id} className="flex items-center gap-3 px-4 py-2 text-xs">
          <Link to={`/jobs?job=${it.job_id}`} className="min-w-0 flex-1 truncate hover:text-accent">
            <span className="font-medium text-text">{it.title}</span> <span className="text-muted">at {it.company}</span>
          </Link>
          {it.status && REPLY[it.status] && <span className="shrink-0 text-muted">{REPLY[it.status]}</span>}
        </li>
      ))}
    </ul>
  );
}

/** A week of the user's search, from their own tracker and matches, with what to change. */
export default function ReviewPage() {
  useDocumentTitle('Your week');
  const [day, setDay] = useState(() => ymd(new Date()));
  const [now] = useState(() => Date.now());
  const { data: r, isLoading, error, refetch } = useQuery({
    queryKey: ['review', day],
    queryFn: () => api<Review>(`/api/review/weekly?week=${day}`),
  });
  const shift = (weeks: number) => setDay(ymd(new Date(new Date(r?.week ?? day).getTime() + weeks * 7 * 86_400_000)));
  const thisWeek = r ? new Date(r.week).getTime() + 7 * 86_400_000 > now : true;
  const diff = r ? r.applied.length - r.applied_prev : 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold">Your week</h1>
          <p className="mt-1 text-xs text-muted">{r ? weekLabel(r.week) : ' '} · from your tracker and matches</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shift(-1)} aria-label="The week before" className="rounded-lg border border-border p-1.5 text-muted hover:text-text">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" onClick={() => shift(1)} disabled={thisWeek} aria-label="The week after" className="rounded-lg border border-border p-1.5 text-muted hover:text-text disabled:opacity-40">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </header>

      {isLoading ? (
        <SkeletonRows rows={5} />
      ) : error || !r ? (
        <ErrorState message={error instanceof Error ? error.message : 'unknown error'} onRetry={() => void refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Applications sent"
              value={r.applied.length}
              sub={diff === 0 ? 'same as the week before' : `${Math.abs(diff)} ${diff > 0 ? 'more' : 'fewer'} than the week before`}
            />
            <StatTile label="Replies" value={r.replies.length} sub="interviews, offers and rejections" />
            <StatTile label="Strong matches" value={`${r.strong_acted}/${r.strong_new}`} sub="acted on, of the new ones" />
            <StatTile label="Waiting 2+ weeks" value={r.waiting} sub="applied, no reply or next step" to="/tracker" />
          </div>

          <section aria-labelledby="suggest-title" className="rounded-card border border-border bg-surface p-4">
            <h2 id="suggest-title" className="flex items-center gap-2 text-sm font-semibold text-text">
              <Lightbulb className="size-4 text-accent" /> What to try
            </h2>
            {r.suggestions.length === 0 ? (
              <p className="mt-2 text-xs text-muted">Nothing stands out this week. Suggestions appear once your tracker shows a pattern.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {r.suggestions.map((s) => (
                  <li key={s.text}>
                    <Link to={s.link} className="group flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm text-text hover:bg-surface-2">
                      <span className="min-w-0 flex-1">{s.text}</span>
                      <ArrowRight className="mt-0.5 size-4 shrink-0 text-faint group-hover:text-accent" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid gap-3 lg:grid-cols-2">
            <section aria-labelledby="sent-title" className="overflow-hidden rounded-card border border-border bg-surface">
              <h2 id="sent-title" className="px-4 pt-4 pb-1 text-sm font-semibold text-text">
                Sent
              </h2>
              <Jobs items={r.applied} empty="No applications sent this week." />
            </section>
            <section aria-labelledby="replies-title" className="overflow-hidden rounded-card border border-border bg-surface">
              <h2 id="replies-title" className="px-4 pt-4 pb-1 text-sm font-semibold text-text">
                Replies
              </h2>
              <Jobs items={r.replies} empty="No replies this week. Mark a job Interviewing, Offer or Rejected when you hear back." />
            </section>
          </div>

          {r.gaps.length > 0 && (
            <section aria-labelledby="gaps-title" className="rounded-card border border-border bg-surface p-4">
              <h2 id="gaps-title" className="text-sm font-semibold text-text">
                What jobs that went nowhere wanted
              </h2>
              <p className="mt-1 text-xs text-muted">Skills missing from your profile in the {r.gaps_of} applications of the last month without a reply or with a no.</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {r.gaps.map((g) => (
                  <li key={g.skill} className="rounded-full border border-border px-2.5 py-1 text-xs text-text">
                    {g.skill} <span className="text-faint">{g.count}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
