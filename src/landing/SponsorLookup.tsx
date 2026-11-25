import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { LoaderCircle, Search } from 'lucide-react';
import { api, ApiError } from '../api/client';
import { compact, wage } from '../lib/format';

interface EmployerSample {
  name: string;
  sector: string;
  filings: number;
  median: string;
  levels: { level: string; pct: number; pay: string }[];
  titles: string[];
}

interface PublicEmployerHit {
  key: string;
  name: string;
  filings: number;
  median_wage: number | null;
}

interface PublicH1BSummary {
  key: string;
  name: string;
  filings: number;
  new_hires: number;
  wage_median: number | null;
  levels: { name: string; filings: number }[];
  titles: { name: string; filings: number }[];
}

const EMPLOYERS: EmployerSample[] = [
  {
    name: 'Stripe',
    sector: 'Fintech',
    filings: 294,
    median: '$188k',
    levels: [
      { level: 'I', pct: 58, pay: '$142k' },
      { level: 'II', pct: 74, pay: '$178k' },
      { level: 'III', pct: 88, pay: '$210k' },
      { level: 'IV', pct: 100, pay: '$244k' },
    ],
    titles: ['Software Engineer', 'Backend Engineer', 'Data Scientist'],
  },
  {
    name: 'NVIDIA',
    sector: 'Semiconductors & AI',
    filings: 1480,
    median: '$196k',
    levels: [
      { level: 'I', pct: 56, pay: '$144k' },
      { level: 'II', pct: 72, pay: '$182k' },
      { level: 'III', pct: 87, pay: '$218k' },
      { level: 'IV', pct: 100, pay: '$256k' },
    ],
    titles: ['Deep Learning Engineer', 'Systems Software Engineer', 'ASIC Engineer'],
  },
  {
    name: 'Datadog',
    sector: 'Cloud & DevTools',
    filings: 365,
    median: '$176k',
    levels: [
      { level: 'I', pct: 55, pay: '$136k' },
      { level: 'II', pct: 71, pay: '$168k' },
      { level: 'III', pct: 86, pay: '$198k' },
      { level: 'IV', pct: 100, pay: '$232k' },
    ],
    titles: ['Software Engineer', 'Site Reliability Engineer', 'Product Manager'],
  },
  {
    name: 'Google',
    sector: 'Big Tech',
    filings: 4920,
    median: '$185k',
    levels: [
      { level: 'I', pct: 56, pay: '$138k' },
      { level: 'II', pct: 72, pay: '$172k' },
      { level: 'III', pct: 87, pay: '$206k' },
      { level: 'IV', pct: 100, pay: '$242k' },
    ],
    titles: ['Software Engineer', 'Research Scientist', 'Technical Program Manager'],
  },
  {
    name: 'Microsoft',
    sector: 'Big Tech',
    filings: 4610,
    median: '$174k',
    levels: [
      { level: 'I', pct: 55, pay: '$132k' },
      { level: 'II', pct: 70, pay: '$164k' },
      { level: 'III', pct: 86, pay: '$196k' },
      { level: 'IV', pct: 100, pay: '$228k' },
    ],
    titles: ['Software Engineer', 'Applied Scientist', 'Product Manager'],
  },
  {
    name: 'Amazon',
    sector: 'Big Tech & Cloud',
    filings: 9240,
    median: '$168k',
    levels: [
      { level: 'I', pct: 54, pay: '$129k' },
      { level: 'II', pct: 71, pay: '$162k' },
      { level: 'III', pct: 86, pay: '$192k' },
      { level: 'IV', pct: 100, pay: '$224k' },
    ],
    titles: ['Software Development Engineer', 'Applied Scientist', 'Data Engineer'],
  },
  {
    name: 'JPMorgan Chase',
    sector: 'Banking',
    filings: 2150,
    median: '$146k',
    levels: [
      { level: 'I', pct: 54, pay: '$112k' },
      { level: 'II', pct: 70, pay: '$138k' },
      { level: 'III', pct: 85, pay: '$166k' },
      { level: 'IV', pct: 100, pay: '$198k' },
    ],
    titles: ['Software Engineer', 'Quantitative Analyst', 'Vice President, Engineering'],
  },
  {
    name: 'Mayo Clinic',
    sector: 'Healthcare',
    filings: 412,
    median: '$134k',
    levels: [
      { level: 'I', pct: 52, pay: '$92k' },
      { level: 'II', pct: 68, pay: '$124k' },
      { level: 'III', pct: 84, pay: '$162k' },
      { level: 'IV', pct: 100, pay: '$215k' },
    ],
    titles: ['Research Fellow', 'Clinical Informaticist', 'Biostatistician'],
  },
  {
    name: 'Snowflake',
    sector: 'Data & Cloud',
    filings: 388,
    median: '$192k',
    levels: [
      { level: 'I', pct: 57, pay: '$146k' },
      { level: 'II', pct: 73, pay: '$182k' },
      { level: 'III', pct: 88, pay: '$216k' },
      { level: 'IV', pct: 100, pay: '$248k' },
    ],
    titles: ['Senior Software Engineer', 'Database Kernel Engineer', 'Solutions Architect'],
  },
  {
    name: 'Goldman Sachs',
    sector: 'Finance',
    filings: 1290,
    median: '$158k',
    levels: [
      { level: 'I', pct: 55, pay: '$118k' },
      { level: 'II', pct: 71, pay: '$148k' },
      { level: 'III', pct: 86, pay: '$178k' },
      { level: 'IV', pct: 100, pay: '$212k' },
    ],
    titles: ['Associate, Engineering', 'Quantitative Strategist', 'Data Engineer'],
  },
];

const QUICK_PICKS = ['Stripe', 'NVIDIA', 'Datadog', 'JPMorgan Chase', 'Mayo Clinic'];

/** Interactive US DOL wage and H-1B sponsorship lookup, backed by live public endpoints with instant sample fallback. */
export function SponsorLookup({ totalEmployers }: { totalEmployers: string }) {
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query.trim());
  const [selected, setSelected] = useState(EMPLOYERS[0].name);
  const [liveKey, setLiveKey] = useState<string | null>(null);

  const searchQ = useQuery({
    queryKey: ['public-h1b-employers', deferred],
    queryFn: () => api<{ employers: PublicEmployerHit[] }>(`/api/public/h1b/employers?q=${encodeURIComponent(deferred)}`),
    enabled: deferred.length >= 2,
    staleTime: 10 * 60_000,
    retry: false,
  });

  const detailQ = useQuery({
    queryKey: ['public-h1b-employer', liveKey],
    queryFn: () => api<PublicH1BSummary>(`/api/public/h1b/employer?key=${encodeURIComponent(liveKey ?? '')}`),
    enabled: liveKey != null,
    staleTime: 30 * 60_000,
    retry: false,
  });

  const sampleMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EMPLOYERS;
    return EMPLOYERS.filter((e) => e.name.toLowerCase().includes(q) || e.sector.toLowerCase().includes(q));
  }, [query]);

  const liveHits = searchQ.data?.employers ?? [];
  const rateLimited = (searchQ.error instanceof ApiError && searchQ.error.status === 429)
    || (detailQ.error instanceof ApiError && detailQ.error.status === 429);

  const activeSample = useMemo(() => {
    if (query.trim() && sampleMatches.length > 0) return sampleMatches[0];
    return EMPLOYERS.find((e) => e.name === selected) ?? EMPLOYERS[0];
  }, [query, sampleMatches, selected]);

  const liveDetail = liveKey && detailQ.data ? detailQ.data : null;
  const liveMaxLevel = liveDetail ? Math.max(1, ...liveDetail.levels.map((l) => l.filings)) : 1;

  return (
    <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[11px] tracking-wider text-faint uppercase">
          {liveDetail ? 'Live DOL LCA summary' : 'Sample employer lookup'}
        </span>
        <span className="font-mono text-[11px] text-faint">{totalEmployers} US employers</span>
      </div>

      <label className="relative mt-3 block">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value.trim()) setLiveKey(null);
          }}
          placeholder="Search any US employer (Stripe, Deloitte, Mayo Clinic…)"
          aria-label="Try a sample employer lookup"
          className="w-full rounded-lg border border-border bg-bg py-2 pr-3 pl-9 text-sm text-text placeholder:text-faint focus:border-accent focus:outline-none"
        />
      </label>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {QUICK_PICKS.map((name) => {
          const isActive = !liveKey && !query.trim() && activeSample.name === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => {
                setQuery('');
                setLiveKey(null);
                setSelected(name);
              }}
              className={clsx(
                'rounded-md border px-2.5 py-1 text-xs transition-colors',
                isActive
                  ? 'border-accent/50 bg-accent/10 font-medium text-accent'
                  : 'border-border bg-bg/60 text-muted hover:border-text/30 hover:text-text',
              )}
            >
              {name}
            </button>
          );
        })}
      </div>

      {deferred.length >= 2 && liveHits.length > 0 && (
        <ul className="mt-3 max-h-40 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-bg/60 text-xs">
          {liveHits.slice(0, 6).map((hit) => (
            <li key={hit.key}>
              <button
                type="button"
                onClick={() => setLiveKey(hit.key)}
                className={clsx(
                  'flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-2/60',
                  liveKey === hit.key && 'bg-accent/10 text-accent',
                )}
              >
                <span className="truncate font-medium text-text">{hit.name}</span>
                <span className="shrink-0 font-mono text-[11px] text-muted">
                  {compact(hit.filings)} filed{hit.median_wage ? ` · ${wage(hit.median_wage)}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {rateLimited && (
        <p className="mt-3 text-xs text-warn">
          Preview lookup limit reached. Create a free account for unlimited employer lookups.
        </p>
      )}

      {detailQ.isLoading ? (
        <div className="mt-5 flex items-center justify-center gap-2 border-t border-border py-10 text-xs text-muted">
          <LoaderCircle className="size-4 animate-spin text-accent" /> Loading DOL filings…
        </div>
      ) : liveDetail ? (
        <div className="mt-5 border-t border-border pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-text">{liveDetail.name || liveKey}</h3>
              <p className="text-xs text-faint">US DOL certified LCA disclosures</p>
            </div>
            <div className="flex gap-5">
              <div>
                <div className="font-mono text-base font-semibold text-text">{liveDetail.filings.toLocaleString()}</div>
                <div className="text-[11px] text-faint">certified filings</div>
              </div>
              <div>
                <div className="font-mono text-base font-semibold text-accent">{wage(liveDetail.wage_median)}</div>
                <div className="text-[11px] text-faint">median base</div>
              </div>
            </div>
          </div>

          {liveDetail.levels.length > 0 && (
            <div className="mt-5 space-y-2">
              <div className="text-[11px] font-medium text-muted">Filings by DOL wage level</div>
              {liveDetail.levels.map((lv) => (
                <div key={lv.name} className="flex items-center gap-3 text-xs">
                  <span className="w-16 shrink-0 whitespace-nowrap font-mono text-[11px] text-faint">{lv.name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-accent/80 transition-all duration-300"
                      style={{ width: `${Math.max(6, Math.round((lv.filings / liveMaxLevel) * 100))}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono text-xs text-text">{compact(lv.filings)}</span>
                </div>
              ))}
            </div>
          )}

          {liveDetail.titles.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-4">
              <span className="mr-1 text-[11px] text-faint">Common titles:</span>
              {liveDetail.titles.map((t) => (
                <span key={t.name} className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
                  {t.name}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : query.trim() && sampleMatches.length === 0 && liveHits.length === 0 && !searchQ.isLoading ? (
        <div className="mt-5 rounded-lg border border-dashed border-border px-4 py-8 text-center">
          <p className="text-sm font-medium text-text">“{query.trim()}” isn't in this 10-employer preview.</p>
          <p className="mt-1 text-xs text-muted">
            Sign up free to search all {totalEmployers} employers from public US DOL LCA disclosures.
          </p>
        </div>
      ) : (
        <div className="mt-5 border-t border-border pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-text">{activeSample.name}</h3>
              <p className="text-xs text-faint">{activeSample.sector} · US DOL certified LCA disclosures</p>
            </div>
            <div className="flex gap-5">
              <div>
                <div className="font-mono text-base font-semibold text-text">{activeSample.filings.toLocaleString()}</div>
                <div className="text-[11px] text-faint">filings / yr</div>
              </div>
              <div>
                <div className="font-mono text-base font-semibold text-accent">{activeSample.median}</div>
                <div className="text-[11px] text-faint">median base</div>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <div className="text-[11px] font-medium text-muted">Base wage distribution (DOL Levels I–IV)</div>
            {activeSample.levels.map((lv) => (
              <div key={lv.level} className="flex items-center gap-3 text-xs">
                <span className="w-14 shrink-0 whitespace-nowrap font-mono text-[11px] text-faint">Lvl {lv.level}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-accent/80 transition-all duration-300"
                    style={{ width: `${lv.pct}%` }}
                  />
                </div>
                <span className="w-12 text-right font-mono text-xs text-text">{lv.pay}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-4">
            <span className="mr-1 text-[11px] text-faint">Common titles:</span>
            {activeSample.titles.map((t) => (
              <span key={t} className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
