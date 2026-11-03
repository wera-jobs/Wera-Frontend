import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowRight, BadgeCheck, ChartNoAxesColumn, Globe2, MousePointer2, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { IndustryIcon } from '../components/IndustryIcon';
import { Logo } from '../components/Logo';
import { compact } from '../lib/format';
import { ThemeToggle } from '../lib/theme';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { AfterTheMatch } from './AfterTheMatch';
import { ExtensionMock, H1BMock, ProductMock, StepApply, StepRadar, StepUpload } from './Illustrations';
import { RevealField } from './RevealField';
import { SiteFooter } from './SiteFooter';

interface Stats { companies: number; industries: number; open_jobs: number; h1b_filings: number; h1b_employers: number }

const INDUSTRIES: [string, string][] = [
  ['ai_ml', 'AI & ML'], ['big_tech', 'Big Tech'], ['cloud', 'Cloud & DevTools'], ['trading', 'Trading'], ['fintech', 'Fintech'],
  ['aerospace', 'Aerospace'], ['robotics', 'Robotics'], ['healthcare', 'Health Tech'], ['biotech', 'Biotech'], ['energy', 'Energy & Climate'],
  ['automotive', 'Autonomy'], ['security', 'Cybersecurity'], ['gaming', 'Gaming'], ['crypto', 'Crypto'], ['defense', 'Defense'],
  ['logistics', 'Logistics'], ['media', 'Media'], ['education', 'Education'], ['hospitals', 'Hospitals'], ['enterprise', 'Enterprise SaaS'],
  ['banking', 'Banking'], ['manufacturing', 'Manufacturing'], ['consulting', 'Consulting'], ['consumer', 'Consumer'],
];

/** Shown until the live numbers arrive, or if the server is away. */
const ROUGH_STATS: Stats = { companies: 5100, industries: 30, open_jobs: 500_000, h1b_filings: 495_000, h1b_employers: 58_000 };

const CTA = 'inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-bg shadow-[0_10px_30px_-10px_var(--color-accent)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-accent/90';
const GHOST = 'inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text transition-colors hover:border-accent/40';

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-mono text-2xl font-semibold tracking-tight text-text sm:text-3xl">{value}</div>
      <div className="mt-1 text-[11px] tracking-wide text-faint uppercase">{label}</div>
    </div>
  );
}

function IndustryRow({ items, reverse }: { items: [string, string][]; reverse?: boolean }) {
  const chips = (k: string) => (
    <div key={k} className="flex shrink-0 gap-3 pr-3">
      {items.map(([id, label]) => (
        <span key={id} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-sm whitespace-nowrap text-text">
          <IndustryIcon id={id} size="sm" /> {label}
        </span>
      ))}
    </div>
  );
  return <div className={clsx('flex w-max', reverse ? 'drift-right' : 'drift-left')} style={{ ['--drift' as string]: '70s' }}>{chips('a')}{chips('b')}</div>;
}

/** The public front page: what Wera is, for visitors who are not signed in. */
export default function LandingPage() {
  useDocumentTitle('Wera: find jobs that fit you');
  const stats = useQuery({ queryKey: ['public-stats'], queryFn: () => api<Stats>('/api/public/stats'), staleTime: 10 * 60_000 });
  const s = stats.data ?? ROUGH_STATS;

  return (
    <div className="min-h-svh overflow-x-clip bg-bg text-text">
      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-30 border-b border-transparent bg-bg/70 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" aria-label="Wera home"><Logo /></Link>
          <div className="hidden items-center gap-5 text-sm text-muted md:flex">
            <a href="#how" className="hover:text-text">How it works</a>
            <a href="#features" className="hover:text-text">Features</a>
            <a href="#international" className="hover:text-text">International students</a>
            <a href="#extension" className="hover:text-text">Extension</a>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login" className="rounded-lg px-2 py-2 text-sm font-medium text-muted hover:text-text sm:px-3">Log in</Link>
            <Link to="/signup" className="rounded-lg bg-text px-3.5 py-2 text-sm font-semibold text-bg hover:opacity-90">Get started</Link>
          </div>
        </nav>
      </header>

      {/* Hero: words hide in the field; the pointer reveals them */}
      <RevealField className="min-h-[94svh] pt-16">
        <section className="relative mx-auto flex min-h-[calc(94svh-4rem)] max-w-4xl flex-col items-center justify-center px-4 py-20 text-center">
          <span className="anim-rise inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">
            <Sparkles className="size-3.5 text-accent" /> For students, new grads and international talent
          </span>
          <h1 className="anim-rise mt-6 text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-6xl md:text-7xl">
            Find the jobs that fit you.{' '}
            <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">And the ones that sponsor.</span>
          </h1>
          <p className="anim-rise mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            Wera watches {s.companies.toLocaleString()} companies every day, scores your best matches against your resume,
            and tells you which ones file H-1Bs and what they pay. You spend your evenings applying, not scrolling.
          </p>
          <div className="anim-rise mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/signup" className={CTA}>Get started, it's free <ArrowRight className="size-4" /></Link>
            <a href="#how" className={GHOST}>See how it works</a>
          </div>
          <p className="mt-6 hidden items-center gap-1.5 text-xs text-faint [@media(hover:hover)]:inline-flex">
            <MousePointer2 className="size-3.5" /> Move your cursor around
          </p>
          <div className="mt-14 grid w-full max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat value={s.companies.toLocaleString()} label="Companies" />
            <Stat value={compact(s.open_jobs)} label="Open jobs" />
            <Stat value={String(s.industries)} label="Industries" />
            <Stat value={compact(s.h1b_filings)} label="H-1B filings" />
          </div>
        </section>
      </RevealField>

      {/* Product preview */}
      <section className="relative mx-auto -mt-10 max-w-5xl px-4 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[1.1fr_1fr]">
          <ProductMock className="float-y" />
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Every morning, your best matches first.</h2>
            <p className="mt-3 text-muted">
              Not keyword soup. Wera reads every posting, ranks it against you, and scores the best ones with the reasons: the skills
              you have, the ones they want, seniority, location, and whether they sponsor.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              {['A fit score from 0 to 100 with the why', 'Sponsorship read from the posting itself', 'Only roles you can apply to: your level, your places'].map((t) => (
                <li key={t} className="flex items-center gap-2"><BadgeCheck className="size-4 text-good" /> {t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-28 sm:px-6">
        <p className="text-center text-xs font-semibold tracking-[0.2em] text-accent uppercase">How it works</p>
        <h2 className="mt-3 text-center text-3xl font-semibold tracking-tight sm:text-4xl">Three minutes to set up. Then it works for you.</h2>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            { art: <StepUpload />, n: '1', t: 'Bring your resume', d: 'Upload it and answer a few questions: roles, places, work authorization. Wera drafts your profile; you edit it.' },
            { art: <StepRadar />, n: '2', t: 'Wera watches the market', d: 'Wera checks thousands of company career pages through the day, drops what you can\'t apply to, and scores the best of the rest.' },
            { art: <StepApply />, n: '3', t: 'Apply with an edge', d: 'A one-page resume tailored to the job, a cover letter, and the extension fills the form. You always press submit.' },
          ].map((x) => (
            <div key={x.n} className="relative rounded-2xl border border-border bg-surface p-6">
              <span className="absolute top-5 right-5 font-mono text-xs text-faint">0{x.n}</span>
              {x.art}
              <h3 className="mt-4 text-lg font-semibold">{x.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      <AfterTheMatch />

      {/* International students */}
      <section id="international" className="scroll-mt-16 border-y border-border bg-surface/50">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-24 sm:px-6 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-2/10 px-3 py-1 text-xs font-medium text-accent-2"><Globe2 className="size-3.5" /> International students</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Stop guessing who sponsors.</h2>
            <p className="mt-3 leading-relaxed text-muted">
              Wera reads what each posting says about visas, and backs it with {compact(s.h1b_filings)} certified
              H-1B filings from the US Department of Labor: how often a company files, for which titles, and what it offered people at your level.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                [ShieldCheck, 'Filter to jobs that say they sponsor, and see the ones that file anyway.'],
                [ChartNoAxesColumn, 'Real offered wages by title, city and level, from the filings.'],
                [Search, 'Look up any employer, even ones Wera does not watch.'],
              ].map(([Icon, t], i) => {
                const I = Icon as typeof ShieldCheck;
                return <li key={i} className="flex gap-3"><I className="mt-0.5 size-4 shrink-0 text-accent" /> <span className="text-muted">{t as string}</span></li>;
              })}
            </ul>
          </div>
          <H1BMock className="float-y md:ml-auto md:max-w-sm" />
        </div>
      </section>

      {/* Industries */}
      <section className="overflow-hidden py-24">
        <h2 className="px-4 text-center text-3xl font-semibold tracking-tight sm:text-4xl">From frontier AI to hospitals.</h2>
        <p className="mx-auto mt-3 max-w-xl px-4 text-center text-muted">
          {s.companies.toLocaleString()} companies across {s.industries} industries, checked every day.
        </p>
        {/* Faded by covers at the edges: a mask over moving rows repaints every frame. */}
        <div className="relative mt-12 space-y-3">
          <IndustryRow items={INDUSTRIES.slice(0, 12)} />
          <IndustryRow items={INDUSTRIES.slice(12)} reverse />
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[10%] bg-gradient-to-r from-bg to-transparent" />
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-[10%] bg-gradient-to-l from-bg to-transparent" />
        </div>
      </section>

      {/* Extension */}
      <section id="extension" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-28 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-[1fr_1.15fr]">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">Chrome extension</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Fill the form. Keep the judgment.</h2>
            <p className="mt-3 leading-relaxed text-muted">
              Save any job from any site, see its fit and sponsorship, attach the resume tailored to it, and let Wera fill the
              application, step by step on multi-page forms. Open questions get a draft in your voice. Wera never submits for you.
            </p>
            <Link to="/signup" className={clsx(CTA, 'mt-7')}>Create your account <ArrowRight className="size-4" /></Link>
            <p className="mt-3 text-xs text-faint">The extension is in private pilot and coming to the Chrome Web Store.</p>
          </div>
          <ExtensionMock />
        </div>
      </section>

      {/* Closing CTA, in its own reveal field */}
      <RevealField className="border-t border-border">
        <section className="mx-auto max-w-3xl px-4 py-28 text-center">
          <h2 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Your next offer is already posted.</h2>
          <p className="mt-4 text-lg text-muted">Let Wera find it while you prepare for the interview.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/signup" className={CTA}>Get started, it's free <ArrowRight className="size-4" /></Link>
            <Link to="/login" className={GHOST}>I have an account</Link>
          </div>
        </section>
      </RevealField>

      <SiteFooter />
    </div>
  );
}
