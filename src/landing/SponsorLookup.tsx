import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Search } from 'lucide-react';

interface EmployerSample {
  name: string;
  sector: string;
  filings: number;
  median: string;
  levels: { level: string; pct: number; pay: string }[];
  titles: string[];
}

// Curated snapshot from public US Department of Labor H-1B LCA disclosures,
// giving visitors a working preview of Wera's wage and sponsorship lookup
// before they create an account.
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

/** Interactive preview of Wera's US DOL wage and H-1B sponsorship lookup. */
export function SponsorLookup({ totalEmployers }: { totalEmployers: string }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(EMPLOYERS[0].name);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EMPLOYERS;
    return EMPLOYERS.filter((e) => e.name.toLowerCase().includes(q) || e.sector.toLowerCase().includes(q));
  }, [query]);

  const current = useMemo(() => {
    if (query.trim() && matches.length > 0) return matches[0];
    return EMPLOYERS.find((e) => e.name === selected) ?? EMPLOYERS[0];
  }, [matches, query, selected]);

  return (
    <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor="landing-employer-search" className="text-xs font-medium text-muted">
          Try a sample employer lookup
        </label>
        <span className="font-mono text-[11px] text-faint">US DOL LCA disclosures</span>
      </div>

      <div className="relative mt-2.5">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
        <input
          id="landing-employer-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter sample employers (Stripe, NVIDIA, Mayo Clinic...)"
          className="w-full rounded-lg border border-border bg-bg py-2 pr-3 pl-9 text-sm text-text placeholder:text-faint focus:border-accent/60 focus:outline-none"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Sample employers">
        {QUICK_PICKS.map((name) => {
          const active = current.name === name && !query.trim();
          return (
            <button
              key={name}
              type="button"
              onClick={() => {
                setQuery('');
                setSelected(name);
              }}
              className={clsx(
                'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                active
                  ? 'border-text bg-text text-bg'
                  : 'border-border bg-bg text-muted hover:border-text/30 hover:text-text',
              )}
            >
              {name}
            </button>
          );
        })}
      </div>

      {query.trim() && matches.length === 0 ? (
        <div className="mt-5 rounded-lg border border-border bg-bg p-4 text-sm text-muted">
          <p className="font-medium text-text">"{query.trim()}" isn't in this 10-employer preview.</p>
          <p className="mt-1 text-xs text-muted">
            Create a free account to search all {totalEmployers} employers in Wera's full DOL dataset.
          </p>
        </div>
      ) : (
        <div className="mt-5 border-t border-border pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-text">{current.name}</h3>
              <p className="text-xs text-faint">{current.sector}</p>
            </div>
            <div className="flex items-baseline gap-5">
              <div className="text-right">
                <div className="font-mono text-lg font-semibold text-text">{current.filings.toLocaleString()}</div>
                <div className="text-[11px] text-faint">certified / yr</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-lg font-semibold text-text">{current.median}</div>
                <div className="text-[11px] text-faint">median base</div>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {current.levels.map((b) => (
              <div key={b.level} className="flex items-center gap-3 text-xs">
                <span className="w-14 shrink-0 whitespace-nowrap font-mono text-faint">Lvl {b.level}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <span className="block h-full rounded-full bg-accent/80 transition-all duration-300" style={{ width: `${b.pct}%` }} />
                </span>
                <span className="w-12 text-right font-mono text-muted">{b.pay}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
            <span className="text-faint">Common titles:</span>
            {current.titles.map((t) => (
              <span key={t} className="rounded bg-surface-2 px-2 py-0.5 text-text">{t}</span>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-[11px] text-faint">
        Sample figures from public LCA filings. Inside Wera you can look up all {totalEmployers} employers and filter jobs by sponsorship.
      </p>
    </div>
  );
}
