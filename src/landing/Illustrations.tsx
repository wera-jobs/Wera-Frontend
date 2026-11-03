// Small product pictures for the landing page, drawn in HTML with the
// theme's colors so they suit light and dark mode and stay crisp. They use
// real copy, never grey placeholder bars; the larger screens in
// AfterTheMatch are real screenshots.
import clsx from 'clsx';
import { Check, MapPin } from 'lucide-react';
import { ScoreRing } from '../components/ScoreRing';
import { IndustryIcon } from '../components/IndustryIcon';

const JOBS = [
  { title: 'Machine Learning Engineer, New Grad', company: 'Frontier AI lab', place: 'San Francisco · Hybrid', score: 94, sponsor: true, ind: 'ai_ml' },
  { title: 'Software Engineer, Flight Software', company: 'Launch startup', place: 'Hawthorne, CA · Onsite', score: 88, sponsor: true, ind: 'aerospace' },
  { title: 'Registered Nurse, ICU', company: 'Academic medical center', place: 'Houston, TX · Nights', score: 91, sponsor: false, ind: 'hospitals' },
];

const SHADOW = 'shadow-[0_1px_2px_rgb(0_0_0/0.05),0_24px_48px_-28px_rgb(0_0_0/0.28)]';

/** A stack of matched jobs, like Today. */
export function ProductMock({ className }: { className?: string }) {
  return (
    <div className={clsx('rounded-2xl border border-border bg-surface p-3', SHADOW, className)} aria-hidden>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-text">Today</span>
        <span className="rounded-full bg-good/10 px-2 py-0.5 text-[10px] font-medium text-good">34 new matches</span>
      </div>
      <div className="space-y-2">
        {JOBS.map((j, i) => (
          <div key={i} className={clsx('flex items-center gap-3 rounded-xl border border-border bg-surface p-3', i === 0 && 'ring-1 ring-accent/30')}>
            <ScoreRing score={j.score} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-text">{j.title}</div>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] whitespace-nowrap text-muted">
                <IndustryIcon id={j.ind} size="xs" bare /> <span className="truncate">{j.company}</span>
                <span className="text-faint">·</span>
                <MapPin className="size-3 shrink-0 text-faint" /> <span className="truncate">{j.place}</span>
              </div>
            </div>
            {j.sponsor && <span className="hidden shrink-0 rounded-full bg-good/10 px-2 py-0.5 text-[10px] font-medium text-good sm:inline">Sponsors visas</span>}
          </div>
        ))}
      </div>
      <p className="mt-2 rounded-xl bg-surface-2/70 px-3 py-2 text-[11px] leading-relaxed text-muted">
        <span className="font-medium text-text">Why it fits:</span> your PyTorch and ranking work lines up with the team's needs;
        entry level, 0+ years, H-1B filed 1,202 times last year.
      </p>
    </div>
  );
}

/** A small H-1B card: filings and pay by level. */
export function H1BMock({ className }: { className?: string }) {
  const bars = [{ l: 'I', w: 58, p: '$129k' }, { l: 'II', w: 70, p: '$157k' }, { l: 'III', w: 84, p: '$172k' }, { l: 'IV', w: 100, p: '$194k' }];
  return (
    <div className={clsx('rounded-2xl border border-border bg-surface p-4', SHADOW, className)} aria-hidden>
      <div className="text-xs font-semibold text-text">H-1B filings <span className="font-normal text-muted">· payments company</span></div>
      <div className="mt-3 flex items-baseline gap-4">
        <div><div className="font-mono text-2xl text-text">294</div><div className="text-[10px] text-faint">certified, last 12 months</div></div>
        <div><div className="font-mono text-2xl text-text">$163k</div><div className="text-[10px] text-faint">median offered</div></div>
      </div>
      <div className="mt-3 space-y-1.5">
        {bars.map((b) => (
          <div key={b.l} className="flex items-center gap-2 text-[10px]">
            <span className="w-6 font-mono text-faint">{b.l}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full rounded-full bg-accent/70" style={{ width: `${b.w}%` }} />
            </span>
            <span className="w-10 text-right font-mono text-muted">{b.p}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg bg-good/10 px-2 py-1.5 text-[11px] text-good">For titles like yours at entry level: $129k to $157k</div>
    </div>
  );
}

const FIELDS: { label: string; value: string; draft?: boolean }[] = [
  { label: 'First name', value: 'Amara' },
  { label: 'Email', value: 'amara@example.com' },
  { label: 'Will you need visa sponsorship?', value: 'Yes, H-1B' },
  { label: 'Why do you want to work here?', value: 'Drafted for you to review', draft: true },
];

/** An application form with the Wera panel beside it, part way through filling. */
export function ExtensionMock({ className }: { className?: string }) {
  return (
    <div className={clsx('overflow-hidden rounded-2xl border border-border bg-surface', SHADOW, className)} aria-hidden>
      <div className="border-b border-border bg-surface-2/60 px-3 py-2">
        <span className="block truncate rounded-md bg-surface px-2.5 py-1 font-mono text-[10px] text-muted">careers.example.com/jobs/ml-engineer/apply</span>
      </div>
      <div className="grid grid-cols-[1fr_44%]">
        <div className="space-y-3 p-4">
          <div>
            <div className="text-[13px] font-semibold text-text">Machine Learning Engineer</div>
            <div className="text-[10px] text-faint">Application, step 1 of 3</div>
          </div>
          {FIELDS.map((f) => (
            <div key={f.label}>
              <div className="mb-1 truncate text-[9px] text-faint">{f.label}</div>
              <div className={clsx('h-6 truncate rounded-md border px-2 text-[10px] leading-6', f.draft ? 'border-accent/50 bg-accent/5 text-muted' : 'border-good/50 bg-good/5 text-text')}>
                {f.value}
              </div>
            </div>
          ))}
        </div>
        <div className="border-l border-border bg-bg/60 p-3 text-[10px]">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-text">Wera</span>
            <span className="font-mono text-muted">fit 94</span>
          </div>
          <div className="mt-2 rounded-lg bg-good/10 px-2 py-1.5 text-good"><Check className="mr-1 inline size-3" />Filled 11 of 12 fields</div>
          <ul className="mt-2.5 space-y-1.5 text-muted">
            <li>Resume tailored for this job</li>
            <li>Files H-1Bs for this title</li>
            <li className="text-accent">1 answer for you to check</li>
          </ul>
          <div className="mt-3 rounded-lg bg-accent px-2 py-1.5 text-center font-semibold text-bg">Fill this step</div>
          <div className="mt-2 text-center text-[9px] text-faint">You always submit</div>
        </div>
      </div>
    </div>
  );
}
