import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowUpRight } from 'lucide-react';

type Category = 'All' | 'Engineering' | 'AI & Data' | 'Product & Design' | 'Finance & Ops';

interface RecentJob {
  id: string;
  company: string;
  markBg: string;
  markFg: string;
  mark: string;
  title: string;
  category: Exclude<Category, 'All'>;
  location: string;
  workMode: 'Hybrid' | 'Remote (US)' | 'On-site';
  salary: string;
  sponsorsH1b: boolean;
  source: 'Greenhouse' | 'Ashby' | 'Lever' | 'Workday';
  postedAgo: string;
}

const CATEGORIES: Category[] = ['All', 'Engineering', 'AI & Data', 'Product & Design', 'Finance & Ops'];

const RECENT_JOBS: RecentJob[] = [
  {
    id: 'stripe-swe',
    company: 'Stripe',
    markBg: '#635BFF',
    markFg: '#FFFFFF',
    mark: 'S',
    title: 'Software Engineer, Payments Infrastructure',
    category: 'Engineering',
    location: 'San Francisco, CA',
    workMode: 'Hybrid',
    salary: '$178k - $232k',
    sponsorsH1b: true,
    source: 'Greenhouse',
    postedAgo: '1h ago',
  },
  {
    id: 'anthropic-ml',
    company: 'Anthropic',
    markBg: '#191918',
    markFg: '#F4EFE6',
    mark: 'A',
    title: 'Research Engineer, Inference Systems',
    category: 'AI & Data',
    location: 'San Francisco, CA',
    workMode: 'Hybrid',
    salary: '$240k - $320k',
    sponsorsH1b: true,
    source: 'Greenhouse',
    postedAgo: '2h ago',
  },
  {
    id: 'figma-design',
    company: 'Figma',
    markBg: '#0ACF83',
    markFg: '#111110',
    mark: 'F',
    title: 'Product Designer, Design Systems',
    category: 'Product & Design',
    location: 'New York, NY',
    workMode: 'Hybrid',
    salary: '$165k - $215k',
    sponsorsH1b: true,
    source: 'Lever',
    postedAgo: '2h ago',
  },
  {
    id: 'ramp-fin',
    company: 'Ramp',
    markBg: '#F4D03F',
    markFg: '#141413',
    mark: 'R',
    title: 'Senior Financial Analyst, Strategic Finance',
    category: 'Finance & Ops',
    location: 'New York, NY',
    workMode: 'Hybrid',
    salary: '$140k - $175k',
    sponsorsH1b: false,
    source: 'Ashby',
    postedAgo: '3h ago',
  },
  {
    id: 'datadog-sec',
    company: 'Datadog',
    markBg: '#632CA6',
    markFg: '#FFFFFF',
    mark: 'D',
    title: 'Backend Software Engineer, Distributed Tracing',
    category: 'Engineering',
    location: 'Boston, MA',
    workMode: 'Hybrid',
    salary: '$162k - $210k',
    sponsorsH1b: true,
    source: 'Greenhouse',
    postedAgo: '4h ago',
  },
  {
    id: 'moderna-data',
    company: 'Moderna',
    markBg: '#E31837',
    markFg: '#FFFFFF',
    mark: 'M',
    title: 'Clinical Data Scientist, Biometrics',
    category: 'AI & Data',
    location: 'Cambridge, MA',
    workMode: 'Hybrid',
    salary: '$148k - $185k',
    sponsorsH1b: true,
    source: 'Workday',
    postedAgo: '4h ago',
  },
  {
    id: 'plaid-pm',
    company: 'Plaid',
    markBg: '#111111',
    markFg: '#FFFFFF',
    mark: 'P',
    title: 'Product Manager, Developer Experience',
    category: 'Product & Design',
    location: 'Remote (US)',
    workMode: 'Remote (US)',
    salary: '$175k - $220k',
    sponsorsH1b: true,
    source: 'Lever',
    postedAgo: '5h ago',
  },
  {
    id: 'cloudflare-ops',
    company: 'Cloudflare',
    markBg: '#F38020',
    markFg: '#FFFFFF',
    mark: 'C',
    title: 'Revenue Operations Manager, Enterprise',
    category: 'Finance & Ops',
    location: 'Austin, TX',
    workMode: 'Hybrid',
    salary: '$135k - $168k',
    sponsorsH1b: false,
    source: 'Greenhouse',
    postedAgo: '6h ago',
  },
];

function CompanyMark({ company, bg, fg, letter }: { company: string; bg: string; fg: string; letter: string }) {
  return (
    <span
      aria-hidden="true"
      title={company}
      style={{ backgroundColor: bg, color: fg }}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold tracking-tight shadow-2xs"
    >
      {letter}
    </span>
  );
}

/** Sample of roles indexed daily directly from employer career pages. */
export function JobsAddedToday({ openJobs, companies }: { openJobs: string; companies: string }) {
  const [category, setCategory] = useState<Category>('All');
  const visible = category === 'All' ? RECENT_JOBS : RECENT_JOBS.filter((j) => j.category === category);

  return (
    <section id="jobs-today" className="scroll-mt-16 border-t border-border bg-surface/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-xl">
            <p className="font-mono text-xs tracking-wider text-faint uppercase">Fresh from career pages</p>
            <h2 className="font-display mt-3 text-3xl font-normal tracking-[-0.02em] sm:text-4xl">
              Jobs added today.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
              {openJobs} open roles tracked across {companies} company boards, refreshed daily with salary ranges and employer sponsorship records attached.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter recent roles by category">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={category === cat}
                onClick={() => setCategory(cat)}
                className={clsx(
                  'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                  category === cat
                    ? 'border-text bg-text text-bg'
                    : 'border-border bg-surface text-muted hover:border-text/30 hover:text-text',
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-border bg-surface divide-y divide-border">
          {visible.map((job) => (
            <Link
              key={job.id}
              to="/signup"
              className="group flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-surface-2/50 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div className="flex min-w-0 items-start gap-3.5 sm:items-center">
                <CompanyMark company={job.company} bg={job.markBg} fg={job.markFg} letter={job.mark} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="truncate text-sm font-semibold text-text group-hover:text-accent transition-colors">
                      {job.title}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                    <span className="font-medium text-text/80">{job.company}</span>
                    <span aria-hidden="true" className="text-faint">·</span>
                    <span>{job.location}</span>
                    <span aria-hidden="true" className="text-faint">·</span>
                    <span>{job.workMode}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pl-11 sm:shrink-0 sm:pl-0">
                <span className="font-mono text-xs font-medium text-text">{job.salary}</span>
                {job.sponsorsH1b && (
                  <span className="rounded-md bg-good/10 px-2 py-0.5 text-[11px] font-medium text-good">
                    H-1B sponsor
                  </span>
                )}
                <span className="hidden rounded-md border border-border px-2 py-0.5 font-mono text-[11px] text-faint md:inline-block">
                  {job.source}
                </span>
                <span className="font-mono text-[11px] text-faint">{job.postedAgo}</span>
                <ArrowUpRight className="size-3.5 text-faint transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-text" />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-4 flex flex-col justify-between gap-2 text-xs text-faint sm:flex-row sm:items-center">
          <span>Representative sample of roles indexed daily from employer career boards. Sign up to see live matches scored against your resume.</span>
          <Link to="/signup" className="shrink-0 font-medium text-text underline decoration-border underline-offset-4 hover:decoration-text">
            Browse all open roles
          </Link>
        </div>
      </div>
    </section>
  );
}
