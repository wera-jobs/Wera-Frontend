import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowUpRight } from 'lucide-react';
import {
  siAirbnb,
  siAnthropic,
  siCloudflare,
  siCoinbase,
  siDatabricks,
  siDatadog,
  siFigma,
  siNotion,
  siNvidia,
  siStripe,
  type SimpleIcon,
} from 'simple-icons';
import { api } from '../api/client';
import { CompanyLogo } from '../components/CompanyLogo';
import { payText, relTime } from '../lib/format';

type Category = 'All' | 'Engineering' | 'AI & Data' | 'Product & Design' | 'Finance & Ops';

interface ApiRecentJob {
  id: number;
  title: string;
  company_id: number;
  company: string;
  industry: string;
  logo_url?: string;
  location: string;
  work_mode: string;
  pay_min: number | null;
  pay_max: number | null;
  pay_currency: string | null;
  pay_period: 'hour' | 'year' | null;
  sponsorship: string;
  h1b_filer: boolean;
  source: string;
  first_seen_at: string;
}

interface RecentJob {
  id: string;
  company: string;
  icon?: SimpleIcon;
  logoUrl?: string;
  title: string;
  category: Exclude<Category, 'All'>;
  location: string;
  workMode: string;
  salary: string;
  sponsorsH1b: boolean;
  source: string;
  postedAgo: string;
}

const CATEGORIES: Category[] = ['All', 'Engineering', 'AI & Data', 'Product & Design', 'Finance & Ops'];

const FALLBACK_JOBS: RecentJob[] = [
  {
    id: 'stripe-swe',
    company: 'Stripe',
    icon: siStripe,
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
    icon: siAnthropic,
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
    icon: siFigma,
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
    id: 'coinbase-fin',
    company: 'Coinbase',
    icon: siCoinbase,
    title: 'Senior Financial Analyst, Strategic Finance',
    category: 'Finance & Ops',
    location: 'Remote (US)',
    workMode: 'Remote (US)',
    salary: '$142k - $178k',
    sponsorsH1b: true,
    source: 'Greenhouse',
    postedAgo: '3h ago',
  },
  {
    id: 'datadog-sec',
    company: 'Datadog',
    icon: siDatadog,
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
    id: 'nvidia-ml',
    company: 'NVIDIA',
    icon: siNvidia,
    title: 'Senior Deep Learning Performance Engineer',
    category: 'AI & Data',
    location: 'Santa Clara, CA',
    workMode: 'Hybrid',
    salary: '$196k - $265k',
    sponsorsH1b: true,
    source: 'Workday',
    postedAgo: '4h ago',
  },
  {
    id: 'airbnb-pm',
    company: 'Airbnb',
    icon: siAirbnb,
    title: 'Product Manager, Search & Discovery',
    category: 'Product & Design',
    location: 'Remote (US)',
    workMode: 'Remote (US)',
    salary: '$180k - $225k',
    sponsorsH1b: true,
    source: 'Greenhouse',
    postedAgo: '5h ago',
  },
  {
    id: 'cloudflare-ops',
    company: 'Cloudflare',
    icon: siCloudflare,
    title: 'Revenue Operations Manager, Enterprise',
    category: 'Finance & Ops',
    location: 'Austin, TX',
    workMode: 'Hybrid',
    salary: '$135k - $168k',
    sponsorsH1b: false,
    source: 'Greenhouse',
    postedAgo: '6h ago',
  },
  {
    id: 'databricks-data',
    company: 'Databricks',
    icon: siDatabricks,
    title: 'Staff Distributed Systems Engineer, Spark Runtime',
    category: 'Engineering',
    location: 'Mountain View, CA',
    workMode: 'Hybrid',
    salary: '$210k - $285k',
    sponsorsH1b: true,
    source: 'Greenhouse',
    postedAgo: '7h ago',
  },
  {
    id: 'notion-design',
    company: 'Notion',
    icon: siNotion,
    title: 'Product Designer, Core Workspace',
    category: 'Product & Design',
    location: 'San Francisco, CA',
    workMode: 'Hybrid',
    salary: '$172k - $220k',
    sponsorsH1b: true,
    source: 'Ashby',
    postedAgo: '8h ago',
  },
];

function classifyRole(title: string, industry: string): Exclude<Category, 'All'> {
  const t = `${title} ${industry}`.toLowerCase();
  if (/\b(ai|ml|machine learning|data scien|research scien|deep learning|analytics|llm)\b/.test(t)) return 'AI & Data';
  if (/\b(product manager|product design|ux|ui|design|brand|creative)\b/.test(t)) return 'Product & Design';
  if (/\b(finance|financial|account|operations|ops|revenue|sales|marketing|recruiter|legal|hr|people|clinical|nurse)\b/.test(t)) return 'Finance & Ops';
  return 'Engineering';
}

const MODE_LABEL: Record<string, string> = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' };
const ATS_LABEL: Record<string, string> = {
  greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby', workday: 'Workday',
  smartrecruiters: 'SmartRecruiters', workable: 'Workable', rippling: 'Rippling', oracle: 'Oracle',
};

function toRecentJob(j: ApiRecentJob): RecentJob {
  const pay = payText(
    { pay_min: j.pay_min, pay_max: j.pay_max, pay_currency: j.pay_currency, pay_period: j.pay_period },
    true,
  );
  return {
    id: String(j.id),
    company: j.company,
    logoUrl: j.logo_url,
    title: j.title,
    category: classifyRole(j.title, j.industry),
    location: j.location || 'United States',
    workMode: MODE_LABEL[j.work_mode] ?? '',
    salary: pay ?? '',
    sponsorsH1b: j.sponsorship === 'yes' || j.h1b_filer,
    source: ATS_LABEL[j.source] ?? j.source,
    postedAgo: relTime(j.first_seen_at),
  };
}

function BrandLogo({ icon, logoUrl, company }: { icon?: SimpleIcon; logoUrl?: string; company: string }) {
  if (logoUrl || !icon) {
    return <CompanyLogo name={company} url={logoUrl} size="lg" className="size-9" />;
  }
  return (
    <span
      aria-hidden="true"
      title={company}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-white shadow-2xs"
    >
      <svg viewBox="0 0 24 24" fill={`#${icon.hex}`} className="size-4.5">
        <path d={icon.path} />
      </svg>
    </span>
  );
}

/** Live (with graceful sample fallback) scrollable feed of roles indexed directly from employer career pages. */
export function JobsAddedToday({ openJobs, companies }: { openJobs: string; companies: string }) {
  const [category, setCategory] = useState<Category>('All');
  const live = useQuery({
    queryKey: ['public-recent-jobs'],
    queryFn: () => api<{ jobs: ApiRecentJob[] }>('/api/public/recent-jobs'),
    staleTime: 10 * 60_000,
    retry: false,
  });
  const liveJobs = live.data?.jobs?.length ? live.data.jobs.map(toRecentJob) : null;
  const all = liveJobs ?? FALLBACK_JOBS;
  const visible = category === 'All' ? all : all.filter((j) => j.category === category);

  return (
    <section id="jobs-today" className="scroll-mt-16 border-t border-border bg-surface/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
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

        <div className="mt-7 overflow-hidden rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border bg-surface-2/60 px-4 py-2 font-mono text-[11px] text-faint sm:px-5">
            <span>
              {visible.length} {liveJobs ? 'live' : 'sample'} {visible.length === 1 ? 'role' : 'roles'}
              {category !== 'All' ? ` in ${category}` : ''}
            </span>
            <span>Scroll to browse</span>
          </div>
          <div className="max-h-[340px] divide-y divide-border overflow-y-auto overscroll-contain">
            {visible.length === 0 ? (
              <p className="px-5 py-8 text-center text-xs text-muted">No recent roles in {category} right now. Try All.</p>
            ) : (
              visible.map((job) => (
                <Link
                  key={job.id}
                  to="/signup"
                  className="group flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2/50 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                >
                  <div className="flex min-w-0 items-start gap-3.5 sm:items-center">
                    <BrandLogo icon={job.icon} logoUrl={job.logoUrl} company={job.company} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="truncate text-sm font-semibold text-text transition-colors group-hover:text-accent">
                          {job.title}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                        <span className="font-medium text-text/80">{job.company}</span>
                        <span aria-hidden="true" className="text-faint">·</span>
                        <span>{job.location}</span>
                        {job.workMode && (
                          <>
                            <span aria-hidden="true" className="text-faint">·</span>
                            <span>{job.workMode}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pl-12 sm:shrink-0 sm:pl-0">
                    {job.salary && <span className="font-mono text-xs font-medium text-text">{job.salary}</span>}
                    {job.sponsorsH1b && (
                      <span className="rounded-md bg-good/10 px-2 py-0.5 text-[11px] font-medium text-good">
                        H-1B sponsor
                      </span>
                    )}
                    {job.source && (
                      <span className="hidden rounded-md border border-border px-2 py-0.5 font-mono text-[11px] text-faint md:inline-block">
                        {job.source}
                      </span>
                    )}
                    <span className="font-mono text-[11px] text-faint">{job.postedAgo}</span>
                    <ArrowUpRight className="size-3.5 text-faint transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-text" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col justify-between gap-2 text-xs text-faint sm:flex-row sm:items-center">
          <span>
            {liveJobs
              ? 'Live postings indexed directly from employer career boards. Sign up to see matches scored against your resume.'
              : 'Representative sample of roles indexed daily from employer career boards. Sign up to see live matches scored against your resume.'}
          </span>
          <Link to="/signup" className="shrink-0 font-medium text-text underline decoration-border underline-offset-4 hover:decoration-text">
            Browse all open roles
          </Link>
        </div>
      </div>
    </section>
  );
}
