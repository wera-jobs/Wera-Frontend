import { useState } from 'react';
import { ExternalLink, Mail, Search } from 'lucide-react';
import { errorMessage } from '../api/client';
import { useAllContacts, useAllOffers } from '../api/crm';
import { relTime, wage } from '../lib/format';
import { EmptyState, ErrorState, SkeletonRows } from './States';

/** Global Contacts CRM tab on TrackerPage. */
export function ContactsView({ onOpenJob }: { onOpenJob: (id: number) => void }) {
  const q = useAllContacts();
  const [search, setSearch] = useState('');
  if (q.isLoading) return <SkeletonRows rows={4} />;
  if (q.isError && !q.data) return <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;
  const all = q.data?.contacts ?? [];
  if (all.length === 0) {
    return (
      <EmptyState
        title="No contacts saved yet"
        hint="Open any tracked application and add recruiters, hiring managers, or referrals under People & follow-ups."
      />
    );
  }
  const needle = search.trim().toLowerCase();
  const rows = needle
    ? all.filter((c) => `${c.name} ${c.role} ${c.company ?? ''} ${c.job_title ?? ''} ${c.email}`.toLowerCase().includes(needle))
    : all;

  return (
    <div className="space-y-3">
      <label className="relative block max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${all.length} contacts…`}
          aria-label="Search contacts"
          className="w-full rounded-lg border border-border bg-surface py-1.5 pr-2.5 pl-8 text-xs text-text placeholder:text-faint focus:border-accent/60 focus:outline-none"
        />
      </label>
      <div className="overflow-x-auto rounded-card border border-border bg-surface">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="border-b border-border text-[11px] text-faint">
            <tr>
              <th scope="col" className="px-3.5 py-2 font-medium">Person</th>
              <th scope="col" className="px-3.5 py-2 font-medium">Application</th>
              <th scope="col" className="px-3.5 py-2 font-medium">Contact</th>
              <th scope="col" className="px-3.5 py-2 font-medium">Last spoke</th>
              <th scope="col" className="px-3.5 py-2 font-medium">Follow up</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-surface-2/50">
                <td className="px-3.5 py-2.5">
                  <div className="font-medium text-text">{c.name}</div>
                  {c.role && <div className="text-[11px] text-muted">{c.role}</div>}
                </td>
                <td className="px-3.5 py-2.5">
                  <button type="button" onClick={() => onOpenJob(c.job_id)} className="text-left hover:text-accent">
                    <div className="font-medium text-text">{c.job_title || `Job #${c.job_id}`}</div>
                    {c.company && <div className="text-[11px] text-muted">{c.company}</div>}
                  </button>
                </td>
                <td className="px-3.5 py-2.5">
                  <div className="flex flex-wrap gap-2">
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 text-accent hover:underline">
                        <Mail className="size-3" /> Email
                      </a>
                    )}
                    {c.linkedin_url && (
                      <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                        LinkedIn <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-3.5 py-2.5 text-muted">{c.last_contacted_at ? relTime(c.last_contacted_at) : '—'}</td>
                <td className="px-3.5 py-2.5 text-muted">{c.follow_up_at ? new Date(c.follow_up_at).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Side-by-side Offers & Total Compensation comparison tab on TrackerPage. */
export function OffersView({ onOpenJob }: { onOpenJob: (id: number) => void }) {
  const q = useAllOffers();
  if (q.isLoading) return <SkeletonRows rows={3} />;
  if (q.isError && !q.data) return <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;
  const offers = q.data?.offers ?? [];
  if (offers.length === 0) {
    return (
      <EmptyState
        title="No offers recorded yet"
        hint="Move an application to Offer (or click Record offer details in any job drawer) to compare base, equity, sign-on, and DOL H-1B wage benchmarks side by side."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead className="border-b border-border text-[11px] text-faint">
          <tr>
            <th scope="col" className="px-3.5 py-2.5 font-medium">Role &amp; company</th>
            <th scope="col" className="px-3.5 py-2.5 text-right font-medium">Base</th>
            <th scope="col" className="px-3.5 py-2.5 text-right font-medium">Bonus</th>
            <th scope="col" className="px-3.5 py-2.5 text-right font-medium">Equity / yr</th>
            <th scope="col" className="px-3.5 py-2.5 text-right font-medium">Sign-on</th>
            <th scope="col" className="px-3.5 py-2.5 text-right font-medium">Annual total</th>
            <th scope="col" className="px-3.5 py-2.5 text-right font-medium">Year 1 total</th>
            <th scope="col" className="px-3.5 py-2.5 text-right font-medium">DOL LCA median</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {offers.map((o) => {
            const median = o.benchmark?.title_median_wage ?? o.benchmark?.employer_median_wage ?? null;
            return (
              <tr key={o.job_id} className="hover:bg-surface-2/50">
                <td className="px-3.5 py-3">
                  <button type="button" onClick={() => onOpenJob(o.job_id)} className="text-left hover:text-accent">
                    <div className="font-semibold text-text">{o.job_title || `Job #${o.job_id}`}</div>
                    <div className="text-[11px] text-muted">
                      {o.company}{o.location ? ` · ${o.location}` : ''}
                    </div>
                  </button>
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-text">{wage(o.base_salary)}</td>
                <td className="px-3.5 py-3 text-right font-mono text-muted">{o.bonus_pct != null ? `${o.bonus_pct}%` : '—'}</td>
                <td className="px-3.5 py-3 text-right font-mono text-muted">{wage(o.annual_equity)}</td>
                <td className="px-3.5 py-3 text-right font-mono text-muted">{wage(o.sign_on)}</td>
                <td className="px-3.5 py-3 text-right font-mono font-semibold text-text">{wage(o.annual_total)}</td>
                <td className="px-3.5 py-3 text-right font-mono font-semibold text-good">{wage(o.first_year_total)}</td>
                <td className="px-3.5 py-3 text-right font-mono text-muted">
                  {median != null ? wage(median) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
