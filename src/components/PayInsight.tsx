// How a job's posted pay compares with H-1B wages for similar titles, at
// the company and in the job's state: ranges on one dollar scale, each
// labelled with where it's from and how many filings it rests on. It owns
// its section, so a job with no comparison shows no empty heading.
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { api } from '../api/client';

interface Range {
  low: number;
  median?: number;
  high: number;
}
interface Insight {
  posted: Range | null;
  company: (Range & { median: number; count: number; level: string }) | null;
  place: (Range & { median: number; count: number; state: string }) | null;
  says: string[];
}

const k = (v: number) => `$${Math.round(v / 1000)}k`;

export function PayInsight({ jobId, company }: { jobId: number; company: string }) {
  const { data } = useQuery({
    queryKey: ['pay-insight', jobId],
    queryFn: () => api<Insight>(`/api/jobs/${jobId}/pay-insight`),
    staleTime: 3_600_000,
  });
  if (!data) return null;
  const rows: { label: string; sub: string; r: Range; posted?: boolean }[] = [];
  if (data.posted) rows.push({ label: 'Posted', sub: 'in the posting', r: data.posted, posted: true });
  if (data.company)
    rows.push({ label: company, sub: `H-1B, similar titles${data.company.level ? `, level ${data.company.level}` : ''} · ${data.company.count} filings`, r: data.company });
  if (data.place) rows.push({ label: data.place.state, sub: `H-1B, all employers, similar titles · ${data.place.count} filings`, r: data.place });
  // A comparison needs the posted pay and at least one wage to set it against.
  if (!data.posted || rows.length < 2) return null;
  const lo = Math.min(...rows.map((x) => x.r.low));
  const hi = Math.max(...rows.map((x) => x.r.high));
  const span = Math.max(hi - lo, 1);
  const at = (v: number) => `${((v - lo) / span) * 100}%`;

  return (
    <section className="border-t border-border px-5 py-4">
      <h3 className="mb-2.5 text-[11px] font-semibold tracking-wide text-faint uppercase">Pay against H-1B wages</h3>
      <div className="space-y-3">
        <div className="space-y-2.5">
          {rows.map(({ label, sub, r, posted }) => (
            <div key={label + sub}>
              <div className="flex items-baseline justify-between gap-2 text-[11px]">
                <span className="min-w-0 truncate">
                  <span className="font-medium text-text">{label}</span> <span className="text-faint">{sub}</span>
                </span>
                <span className="shrink-0 font-mono text-text">
                  {k(r.low)}–{k(r.high)}
                </span>
              </div>
              <div
                className="relative mt-1 h-2 rounded-full bg-surface-2"
                role="img"
                aria-label={`${label}: ${k(r.low)} to ${k(r.high)}${r.median ? `, median ${k(r.median)}` : ''}`}
              >
                <span
                  className={clsx('absolute inset-y-0 rounded-full', posted ? 'bg-accent' : 'bg-muted/45')}
                  style={{ left: at(r.low), width: `max(4px, calc(${at(r.high)} - ${at(r.low)}))` }}
                />
                {r.median != null && (
                  <span
                    className="absolute top-[-2px] bottom-[-2px] w-0.5 rounded-full bg-text"
                    style={{ left: `calc(${at(r.median)} - 1px)` }}
                    title={`Median ${k(r.median)}`}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        <ul className="space-y-1 text-xs leading-relaxed text-muted">
          {data.says.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="text-[10px] text-faint">
          H-1B ranges run from the 10th to the 90th percentile of filed wages; the dark tick is the median. Department of Labor data.
        </p>
      </div>
    </section>
  );
}
