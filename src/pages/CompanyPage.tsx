import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bell, BellOff, EyeOff, ExternalLink } from 'lucide-react';
import { useCompanyPage, useFollowCompany, useHideCompany, useStatusWithUndo } from '../api/hooks';
import { CompanyLogo } from '../components/CompanyLogo';
import { H1BDetailPanel } from '../components/H1BDetailPanel';
import { IndustryBadge } from '../components/JobBadges';
import { JobCard } from '../components/JobCard';
import { JobDrawer } from '../components/JobDrawer';
import { StatTile } from '../components/StatTile';
import { EmptyState, ErrorState, SkeletonRows } from '../components/States';
import { relTime } from '../lib/format';
import { toast } from '../lib/toast';
import { errorMessage } from '../api/client';
import { useDocumentTitle } from '../lib/useDocumentTitle';

const BTN =
  'inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-accent/40 disabled:opacity-50';

export default function CompanyPage() {
  const id = Number(useParams<{ id: string }>().id);
  const { data: c, isLoading, error, refetch } = useCompanyPage(id);
  useDocumentTitle(c?.name ?? 'Company');
  const follow = useFollowCompany();
  const hide = useHideCompany();
  const quickStatus = useStatusWithUndo();
  const [drawer, setDrawer] = useState<number | null>(null);

  if (isLoading) return <SkeletonRows rows={6} />;
  if (error || !c) return <ErrorState message={error instanceof Error ? error.message : 'company not found'} onRetry={() => void refetch()} />;
  const says = (k: string) => c.sponsorship[k] ?? 0;
  const matchCount = c.match_count ?? c.matches.length;
  const shown = c.matches.slice(0, 12);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <CompanyLogo name={c.name} url={c.logo_url} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate text-[28px] leading-tight font-semibold">{c.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              <IndustryBadge value={c.industry} />
              <span>
                {c.open_jobs} open {c.open_jobs === 1 ? 'role' : 'roles'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={c.followed}
            disabled={follow.isPending}
            onClick={() =>
              follow.mutate(
                { id: c.id, follow: !c.followed },
                { onSuccess: () => toast.success(c.followed ? `Stopped following ${c.name}.` : `Following ${c.name}: new roles show up in your notifications.`) },
              )
            }
            className={BTN}
          >
            {c.followed ? <BellOff className="size-3.5" /> : <Bell className="size-3.5" />}
            {c.followed ? 'Following' : 'Follow'}
          </button>
          {!c.hidden && c.ats !== 'manual' && (
            <button
              type="button"
              onClick={() =>
                hide.mutate(
                  { id: c.id, hidden: true },
                  {
                    onSuccess: () =>
                      toast.success(`${c.name} hidden from your matches.`, { label: 'Undo', run: () => hide.mutate({ id: c.id, hidden: false }, { onError: (e: unknown) => toast.error(errorMessage(e)) }) }),
                    onError: (e: unknown) => toast.error(errorMessage(e)),
                  },
                )
              }
              className={BTN}
            >
              <EyeOff className="size-3.5" /> Hide
            </button>
          )}
        </div>
      </header>

      {c.hidden && (
        <p className="rounded-card border border-border bg-surface px-4 py-3 text-xs text-muted">
          You hid {c.name}, so its jobs stay out of your matches.{' '}
          <button type="button" onClick={() => hide.mutate({ id: c.id, hidden: false }, { onError: (e: unknown) => toast.error(errorMessage(e)) })} className="font-medium text-accent hover:underline">
            Unhide
          </button>
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Your matches" value={matchCount} sub="open roles that fit you" />
        <StatTile label="Open roles" value={c.open_jobs} sub="all teams" />
        <StatTile label="Says it sponsors" value={says('yes')} sub={`of ${says('yes') + says('no') + says('unknown')} postings scored for you`} />
        <StatTile label="Rules sponsorship out" value={says('no')} sub="postings that say so" />
      </div>

      <section aria-labelledby="matches-title" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="matches-title" className="text-sm font-semibold text-text">
            Your matches
          </h2>
          {matchCount > shown.length && (
            <Link to={`/jobs?q=${encodeURIComponent(c.name)}`} className="text-xs font-medium text-accent hover:underline">
              See all {matchCount} in Jobs
            </Link>
          )}
        </div>
        {c.matches.length === 0 ? (
          <EmptyState title={c.hidden ? 'Hidden from your matches' : 'No matches here yet'} hint="Open roles that fit your preferences show up here once scored." />
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {shown.map((job, i) => (
              <JobCard key={job.id} job={job} index={i} onOpen={setDrawer} onQuickStatus={quickStatus} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="roles-title" className="overflow-hidden rounded-card border border-border bg-surface">
        <h2 id="roles-title" className="px-4 pt-4 text-sm font-semibold text-text">
          All open roles
          {c.open_jobs > c.roles.length && <span className="ml-2 text-xs font-normal text-muted">the newest {c.roles.length} of {c.open_jobs}</span>}
        </h2>
        {c.roles.length === 0 ? (
          <p className="px-4 py-4 text-xs text-muted">No open roles right now.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {c.roles.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                <span className="min-w-0 flex-1">
                  {r.match ? (
                    <button type="button" onClick={() => setDrawer(r.id)} className="block truncate text-left font-medium text-text hover:text-accent">
                      {r.title}
                    </button>
                  ) : (
                    <span className="block truncate font-medium text-text">{r.title}</span>
                  )}
                  <span className="block truncate text-muted">{r.location}</span>
                </span>
                {r.match && <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">Match</span>}
                <span className="hidden shrink-0 text-faint sm:inline">{relTime(r.posted_at ?? r.first_seen_at)}</span>
                <a href={r.url} target="_blank" rel="noreferrer" aria-label={`Open the posting for ${r.title}`} className="shrink-0 text-muted hover:text-accent">
                  <ExternalLink className="size-3.5" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {c.h1b != null && (
        <section aria-labelledby="h1b-title" className="rounded-card border border-border bg-surface p-4">
          <h2 id="h1b-title" className="mb-3 text-sm font-semibold text-text">
            H-1B filings
          </h2>
          <H1BDetailPanel target={{ companyId: c.id }} />
        </section>
      )}

      {drawer != null && <JobDrawer jobId={drawer} onClose={() => setDrawer(null)} />}
    </div>
  );
}
