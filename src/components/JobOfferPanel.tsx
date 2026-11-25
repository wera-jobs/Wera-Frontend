import { useState } from 'react';
import { DollarSign, Trash2 } from 'lucide-react';
import { errorMessage } from '../api/client';
import { useDeleteJobOffer, useJobOffer, useSaveJobOffer } from '../api/crm';
import type { JobDetail } from '../api/types';
import { wage } from '../lib/format';
import { toast } from '../lib/toast';

const INPUT =
  'w-full rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-xs text-text placeholder:text-faint hover:border-accent/40 focus:border-accent/60 focus:outline-none';

const numOrNull = (s: string): number | null => {
  const n = Number(s.replace(/[^0-9.]/g, ''));
  return s.trim() !== '' && Number.isFinite(n) ? n : null;
};

/** Structured compensation offer form + DOL H-1B LCA benchmark inside the job drawer. */
export function JobOfferPanel({ job }: { job: JobDetail }) {
  const q = useJobOffer(job.id);
  const save = useSaveJobOffer(job.id);
  const del = useDeleteJobOffer(job.id);

  const offer = q.data ?? null;
  const [open, setOpen] = useState(() => job.application_status === 'offer' || offer != null);
  const [base, setBase] = useState('');
  const [bonusPct, setBonusPct] = useState('');
  const [equity, setEquity] = useState('');
  const [signOn, setSignOn] = useState('');
  const [deadline, setDeadline] = useState('');
  const [syncedId, setSyncedId] = useState<string | null>(null);

  if (offer && offer.updated_at !== syncedId) {
    setSyncedId(offer.updated_at);
    setOpen(true);
    setBase(offer.base_salary != null ? String(offer.base_salary) : '');
    setBonusPct(offer.bonus_pct != null ? String(offer.bonus_pct) : '');
    setEquity(offer.annual_equity != null ? String(offer.annual_equity) : '');
    setSignOn(offer.sign_on != null ? String(offer.sign_on) : '');
    setDeadline(offer.deadline_at ? offer.deadline_at.slice(0, 10) : '');
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    save.mutate(
      {
        base_salary: numOrNull(base),
        bonus_pct: numOrNull(bonusPct),
        annual_equity: numOrNull(equity),
        sign_on: numOrNull(signOn),
        currency: 'USD',
        work_mode: job.work_mode && job.work_mode !== 'unknown' ? job.work_mode : '',
        location: job.location_summary ?? job.location_raw ?? '',
        deadline_at: deadline ? new Date(`${deadline}T17:00`).toISOString() : null,
      },
      {
        onSuccess: () => toast.success('Offer details saved.'),
        onError: (err) => toast.error(errorMessage(err, 'Could not save offer')),
      },
    );
  };

  if (!open && !offer && job.application_status !== 'offer') {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
      >
        <DollarSign className="size-3" /> Record offer details
      </button>
    );
  }

  const bench = offer?.benchmark;
  const median = bench?.title_median_wage ?? bench?.employer_median_wage ?? null;

  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface-2/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-text">
          <DollarSign className="size-3.5 text-good" /> Offer &amp; compensation
        </span>
        {offer && (
          <button
            type="button"
            onClick={() => del.mutate(undefined, { onSuccess: () => toast.success('Offer cleared.') })}
            aria-label="Delete offer"
            className="rounded p-1 text-faint hover:text-bad"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      {offer && offer.annual_total != null && (
        <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-surface p-2 text-xs">
          <div>
            <div className="text-[10px] text-faint uppercase">Annual total</div>
            <div className="font-mono font-semibold text-text">{wage(offer.annual_total)}</div>
          </div>
          <div>
            <div className="text-[10px] text-faint uppercase">Year 1 total</div>
            <div className="font-mono font-semibold text-good">{wage(offer.first_year_total)}</div>
          </div>
          {median != null && offer.base_salary != null && (
            <div className="col-span-2 border-t border-border pt-1.5 text-[11px] text-muted">
              DOL H-1B median base ({bench?.title_median_wage ? 'similar title' : job.company}):{' '}
              <span className="font-mono font-semibold text-text">{wage(median)}</span>{' '}
              <span className={offer.base_salary >= median ? 'text-good' : 'text-warn'}>
                ({offer.base_salary >= median ? '+' : ''}{Math.round(((offer.base_salary - median) / median) * 100)}%)
              </span>
            </div>
          )}
        </div>
      )}

      <form onSubmit={submit} className="space-y-2">
        <div className="grid grid-cols-2 gap-1.5">
          <label className="text-[10px] text-muted">
            Base ($)
            <input value={base} onChange={(e) => setBase(e.target.value)} placeholder="165000" className={`${INPUT} mt-0.5`} />
          </label>
          <label className="text-[10px] text-muted">
            Bonus (%)
            <input value={bonusPct} onChange={(e) => setBonusPct(e.target.value)} placeholder="10" className={`${INPUT} mt-0.5`} />
          </label>
          <label className="text-[10px] text-muted">
            Annual equity ($)
            <input value={equity} onChange={(e) => setEquity(e.target.value)} placeholder="40000" className={`${INPUT} mt-0.5`} />
          </label>
          <label className="text-[10px] text-muted">
            Sign-on ($)
            <input value={signOn} onChange={(e) => setSignOn(e.target.value)} placeholder="20000" className={`${INPUT} mt-0.5`} />
          </label>
          <label className="col-span-2 text-[10px] text-muted">
            Decision deadline
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={`${INPUT} mt-0.5`} />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-bg hover:bg-accent/85 disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : 'Save offer'}
          </button>
        </div>
      </form>
    </div>
  );
}
