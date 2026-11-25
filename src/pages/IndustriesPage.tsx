import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowRight, Factory, Search, Star } from 'lucide-react';
import { useIndustries } from '../api/hooks';
import { useProfile } from '../api/profile';
import type { Industry } from '../api/types';
import { IndustryIcon } from '../components/IndustryIcon';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { errorMessage } from '../api/client';
import { verdictColor, verdictOf } from '../lib/format';
import { useDocumentTitle } from '../lib/useDocumentTitle';

function IndustryCard({ ind, starred }: { ind: Industry; starred: boolean }) {
  return (
    <Link
      to={`/industries/${ind.id}`}
      className="anim-rise group flex flex-col rounded-card border border-border bg-surface p-4 transition-colors duration-150 hover:border-accent/40"
    >
      <div className="flex items-center gap-3">
        <IndustryIcon id={ind.id} className="transition-transform duration-200 group-hover:scale-105" />
        <h3 className="min-w-0 flex-1 text-sm leading-snug font-semibold text-text">{ind.label}</h3>
        {starred && <Star className="size-3.5 shrink-0 fill-accent text-accent" aria-label="Preferred" />}
      </div>
      <p className="mt-1 line-clamp-2 flex-1 text-xs text-muted">{ind.description}</p>
      <div className="mt-4 flex items-end justify-between">
        <div className="flex gap-4 text-[11px] text-faint">
          <span>
            <span className="font-mono text-sm text-text">{ind.matches}</span> matches
          </span>
          <span>
            <span className="font-mono text-sm text-muted">{ind.companies}</span> companies
          </span>
          <span>
            <span className="font-mono text-sm text-muted">{ind.open_jobs.toLocaleString()}</span> open
          </span>
        </div>
        {ind.top_score != null ? (
          <span
            className={clsx('font-mono text-sm font-semibold', verdictColor[verdictOf(ind.top_score)])}
            title="Best fit score in this industry"
          >
            {ind.top_score}
          </span>
        ) : (
          <ArrowRight className="size-4 text-faint transition-colors group-hover:text-accent" />
        )}
      </div>
    </Link>
  );
}

/** Every industry Wera watches, with the user's matches in each. */
export default function IndustriesPage() {
  useDocumentTitle('Industries');
  const industries = useIndustries();
  const profile = useProfile();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'az' | 'matches' | 'score' | 'open'>('az');
  const preferred = new Set(profile.data?.answers?.industries ?? []);

  if (industries.isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }
  if (industries.isLoadingError) {
    return <ErrorState message={errorMessage(industries.error)} onRetry={() => void industries.refetch()} />;
  }
  const all = (industries.data?.industries ?? []).filter((i) => i.companies > 0);
  if (all.length === 0) {
    return <EmptyState icon={<Factory className="size-5 text-faint" />} title="No industries yet" />;
  }
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? all.filter((i) => `${i.label} ${i.description}`.toLowerCase().includes(needle))
    : all;
  const cmp = (a: Industry, b: Industry) => {
    if (sort === 'matches') return b.matches - a.matches || a.label.localeCompare(b.label);
    if (sort === 'score') return (b.top_score ?? -1) - (a.top_score ?? -1) || a.label.localeCompare(b.label);
    if (sort === 'open') return b.open_jobs - a.open_jobs || a.label.localeCompare(b.label);
    return a.label.localeCompare(b.label);
  };
  const ordered = [...filtered].sort(cmp);
  const mine = ordered.filter((i) => preferred.has(i.id));
  const rest = ordered.filter((i) => !preferred.has(i.id));
  const totalCompanies = all.reduce((n, i) => n + i.companies, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold">Industries</h1>
          <p className="mt-1 text-xs text-muted">
            {totalCompanies} companies across {all.length} industries. Open one to see your matches and
            its companies.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <label className="relative min-w-48 flex-1 sm:w-56 sm:flex-none">
            <span className="sr-only">Search industries</span>
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search industries…"
              className="w-full rounded-lg border border-border bg-surface py-1.5 pr-2.5 pl-8 text-xs text-text placeholder:text-faint focus:border-accent/60 focus:outline-none"
            />
          </label>
          <select
            aria-label="Sort industries"
            value={sort}
            onChange={(e) => setSort(e.target.value as 'az' | 'matches' | 'score' | 'open')}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text focus:border-accent/60 focus:outline-none"
          >
            <option value="az">A to Z</option>
            <option value="matches">Most matches</option>
            <option value="score">Highest fit score</option>
            <option value="open">Most open jobs</option>
          </select>
        </div>
      </header>
      {ordered.length === 0 && (
        <EmptyState icon={<Factory className="size-5 text-faint" />} title={`No industry matches “${query}”`} />
      )}
      {mine.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium tracking-wide text-faint uppercase">Your industries</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {mine.map((ind) => (
              <IndustryCard key={ind.id} ind={ind} starred />
            ))}
          </div>
        </section>
      )}
      <section className="space-y-3">
        {mine.length > 0 && (
          <h2 className="text-xs font-medium tracking-wide text-faint uppercase">All industries</h2>
        )}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rest.map((ind) => (
            <IndustryCard key={ind.id} ind={ind} starred={false} />
          ))}
        </div>
      </section>
    </div>
  );
}
