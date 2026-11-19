// The tracker's Progress view: how applications move from sent to
// interview to offer, week by week and by applicant system.
import { useState } from 'react';
import { useAppAnalytics } from '../api/hooks';
import { StatTile } from './StatTile';
import { EmptyState, Skeleton } from './States';

const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : '—');
const days = (d: number | null) => (d == null ? '—' : `${d < 10 ? d.toFixed(1) : Math.round(d)}d`);
const SOURCE: Record<string, string> = {
  greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby', workday: 'Workday', smartrecruiters: 'SmartRecruiters',
  workable: 'Workable', rippling: 'Rippling', oracle: 'Oracle', manual: 'Added by you',
};

export function Progress() {
  const { data, isLoading } = useAppAnalytics();
  const [hover, setHover] = useState<number | null>(null);
  if (isLoading || !data) return <Skeleton className="h-64 w-full" />;
  const { reached, weeks, sources } = data;
  if (reached.applied === 0) {
    return (
      <EmptyState
        title="No applications yet"
        hint="Mark a job Applied (or let the extension do it as you apply) and this view shows how your applications move: replies, interviews, offers, week by week."
      />
    );
  }
  const responded = sources.reduce((n, s) => n + s.responded, 0);
  const funnel = [
    { label: 'Applied', n: reached.applied },
    { label: 'Interviewing', n: reached.interviewing },
    { label: 'Offer', n: reached.offer },
  ];
  const peak = Math.max(1, ...weeks.map((w) => w.applied));
  const shown = hover != null ? weeks[hover] : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Applied" value={reached.applied} sub="applications sent" />
        <StatTile label="Heard back" value={pct(responded, reached.applied)} sub={`${responded} of ${reached.applied} got a reply: interview, offer or rejection`} />
        <StatTile label="To a first interview" value={days(data.days_to_interview)} sub="median, from applying" />
        <StatTile label="To an offer" value={days(data.days_to_offer)} sub="median, from a first interview" />
      </div>

      <section aria-labelledby="funnel-title" className="rounded-card border border-border bg-surface p-4">
        <h2 id="funnel-title" className="text-sm font-semibold text-text">How far applications got</h2>
        <div className="mt-3 space-y-2">
          {funnel.map((f) => (
            <div key={f.label} className="grid grid-cols-[6.5rem_1fr_5.5rem] items-center gap-3 text-xs">
              <span className="text-muted">{f.label}</span>
              <span className="h-3 overflow-hidden rounded-r-[4px] bg-surface-2" role="img" aria-label={`${f.label}: ${f.n}`}>
                <span className="block h-full rounded-r-[4px] bg-accent" style={{ width: `${(f.n / reached.applied) * 100}%` }} />
              </span>
              <span className="text-right font-mono text-text">
                {f.n} <span className="text-faint">{f.label === 'Applied' ? '' : pct(f.n, reached.applied)}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="weeks-title" className="rounded-card border border-border bg-surface p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="weeks-title" className="text-sm font-semibold text-text">Applications per week</h2>
          <span className="text-xs text-muted" aria-live="polite">
            {shown
              ? `Week of ${new Date(shown.week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${shown.applied} sent, ${shown.responded} heard back, ${shown.interview} interview${shown.interview === 1 ? '' : 's'}`
              : 'Last 12 weeks. Point at a week for its replies.'}
          </span>
        </div>
        <div className="mt-3 flex h-32 items-end gap-1 border-b border-border" onMouseLeave={() => setHover(null)}>
          {weeks.map((w, i) => (
            <button
              key={w.week}
              type="button"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`Week of ${new Date(w.week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${w.applied} sent, ${w.responded} heard back`}
              className="flex h-full flex-1 items-end rounded-t-sm focus-visible:outline-2 focus-visible:outline-accent"
            >
              <span
                className={`block w-full rounded-t-[4px] transition-colors ${hover === i ? 'bg-accent' : 'bg-accent/70'}`}
                style={{ height: w.applied ? `${Math.max(4, (w.applied / peak) * 100)}%` : '0' }}
              />
            </button>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-faint">
          <span>{new Date(weeks[0].week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          <span>This week</span>
        </div>
      </section>

      {sources.length > 0 && (
        <section aria-labelledby="sources-title" className="overflow-hidden rounded-card border border-border bg-surface">
          <h2 id="sources-title" className="px-4 pt-4 text-sm font-semibold text-text">By applicant system</h2>
          <table className="mt-2 w-full text-left text-xs">
            <thead className="border-b border-border text-[11px] text-faint">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">System</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Applied</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Heard back</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Interviews</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.source} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-text">{SOURCE[s.source] ?? s.source}</td>
                  <td className="px-4 py-2 text-right font-mono">{s.applied}</td>
                  <td className="px-4 py-2 text-right font-mono">{s.responded} <span className="text-faint">{pct(s.responded, s.applied)}</span></td>
                  <td className="px-4 py-2 text-right font-mono">{s.interview}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
