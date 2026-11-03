import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowRight, BadgeCheck, MousePointer2 } from 'lucide-react';
import { api } from '../api/client';
import { Logo } from '../components/Logo';
import { short, thousands } from '../lib/format';
import { ThemeToggle } from '../lib/theme';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { usePublicPage } from '../lib/usePublicPage';
import { AfterTheMatch } from './AfterTheMatch';
import { ExtensionMock, H1BMock, ProductMock } from './Illustrations';
import { RevealField } from './RevealField';
import { SiteFooter } from './SiteFooter';

interface Stats { companies: number; industries: number; open_jobs: number; h1b_filings: number; h1b_employers: number }

const INDUSTRIES = [
  'AI & ML', 'Big Tech', 'Cloud & DevTools', 'Trading', 'Fintech', 'Aerospace', 'Robotics', 'Health Tech', 'Biotech', 'Energy & Climate',
  'Autonomy', 'Cybersecurity', 'Gaming', 'Crypto', 'Defense', 'Logistics', 'Media', 'Education', 'Hospitals', 'Enterprise SaaS',
  'Banking', 'Manufacturing', 'Consulting', 'Consumer',
];

const STEPS = [
  { t: 'Bring your resume', d: 'Upload it and answer a few questions: roles, places, work authorization. Wera drafts your profile; you edit it.' },
  { t: 'Wera watches the market', d: 'Wera checks thousands of company career pages through the day, drops what you can\'t apply to, and scores the best of the rest.' },
  { t: 'Apply with an edge', d: 'A one-page resume tailored to the job, a cover letter, and the extension fills the form. You always press submit.' },
];

/** Shown until the live numbers arrive, or if the server is away. */
const ROUGH_STATS: Stats = { companies: 5100, industries: 30, open_jobs: 500_000, h1b_filings: 495_000, h1b_employers: 58_000 };

const CTA = 'inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-bg transition-colors duration-150 hover:bg-accent/90';
const GHOST = 'inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text transition-colors hover:border-text/30';

function IndustryRow({ items, reverse }: { items: string[]; reverse?: boolean }) {
  // The row is drawn twice so the drift can loop; screen readers get it once.
  const names = (copy: boolean) => (
    <div className="flex shrink-0 gap-2.5 pr-2.5" aria-hidden={copy || undefined}>
      {items.map((label) => (
        <span key={label} className="rounded-full border border-border px-4 py-2 text-sm whitespace-nowrap text-muted">{label}</span>
      ))}
    </div>
  );
  return <div className={clsx('flex w-max', reverse ? 'drift-right' : 'drift-left')} style={{ ['--drift' as string]: '70s' }}>{names(false)}{names(true)}</div>;
}

/** The public front page: what Wera is, for visitors who are not signed in. */
export default function LandingPage() {
  useDocumentTitle('Wera: find jobs that fit you', false);
  usePublicPage('/');
  const stats = useQuery({ queryKey: ['public-stats'], queryFn: () => api<Stats>('/api/public/stats'), staleTime: 10 * 60_000 });
  const s = stats.data ?? ROUGH_STATS;

  return (
    <div className="min-h-svh overflow-x-clip bg-bg text-text">
      <a href="#main" className="sr-only rounded-lg bg-surface px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50">
        Skip to content
      </a>
      <header className="fixed inset-x-0 top-0 z-30 border-b border-transparent bg-bg/70 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6" aria-label="Main">
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

      <main id="main">
        {/* Hero: words hide in the field; the pointer reveals them */}
        <RevealField className="min-h-[94svh] pt-16">
          <section className="relative mx-auto flex min-h-[calc(94svh-4rem)] max-w-4xl flex-col items-center justify-center px-4 py-20 text-center">
            <p className="anim-rise text-sm text-muted">For students, new grads and international talent</p>
            <h1 className="anim-rise mt-5 text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-6xl md:text-7xl">
              <span className="block">Find the jobs that fit you.</span>
              {/* The page's one gradient, in the logo's own colors. */}
              <span className="block bg-gradient-to-r from-accent to-[color-mix(in_oklab,var(--color-accent)_55%,#e0306a)] bg-clip-text pb-1 text-transparent">
                And the ones that sponsor.
              </span>
            </h1>
            <p className="anim-rise mt-6 max-w-2xl text-base leading-relaxed text-pretty text-muted sm:text-lg">
              Wera watches {s.companies.toLocaleString('en-US')} companies every day, scores your best matches against your resume,
              and tells you which ones file H-1Bs and what they pay. You spend your evenings applying, not scrolling.
            </p>
            <div className="anim-rise mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/signup" className={CTA}>Get started, it's free <ArrowRight className="size-4" /></Link>
              <a href="#how" className={GHOST}>See how it works</a>
            </div>
            <p className="mt-6 hidden items-center gap-1.5 text-xs text-faint [@media(hover:hover)]:inline-flex">
              <MousePointer2 className="size-3.5" /> Move your cursor around
            </p>
            <dl className="mt-14 grid w-full max-w-2xl grid-cols-2 gap-y-6 sm:grid-cols-4 sm:divide-x sm:divide-border">
              {[
                [s.companies.toLocaleString('en-US'), 'companies'],
                [short(s.open_jobs), 'open jobs'],
                [String(s.industries), 'industries'],
                [short(s.h1b_filings), 'H-1B filings'],
              ].map(([value, label]) => (
                <div key={label} className="flex flex-col-reverse items-center gap-1">
                  <dt className="text-sm text-muted">{label}</dt>
                  <dd className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </RevealField>

        {/* Product preview */}
        <section className="relative mx-auto -mt-10 max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[1.1fr_1fr]">
            <ProductMock />
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Every morning, your best matches first.</h2>
              <p className="mt-3 text-pretty text-muted">
                Wera reads every posting, ranks it against you, and scores the best ones with the reasons: the skills you have,
                the ones they want, seniority, location, and whether they sponsor.
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                {['A fit score from 0 to 100 with the why', 'Sponsorship read from the posting itself', 'Only roles you can apply to: your level, your places'].map((t) => (
                  <li key={t} className="flex items-center gap-2"><BadgeCheck className="size-4 shrink-0 text-good" /> {t}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-28 sm:px-6">
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Three minutes to set up. Then it works for you.</h2>
          <ol className="mt-12 grid gap-x-10 md:grid-cols-3">
            {STEPS.map((x, i) => (
              <li key={x.t} className="border-t border-border pt-5 pb-8">
                <span className="font-mono text-sm text-faint">{i + 1}</span>
                <h3 className="mt-3 text-lg font-semibold">{x.t}</h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-pretty text-muted">{x.d}</p>
              </li>
            ))}
          </ol>
        </section>

        <AfterTheMatch />

        {/* International students */}
        <section id="international" className="scroll-mt-16 border-y border-border bg-surface/50">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-24 sm:px-6 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Stop guessing who sponsors.</h2>
              <p className="mt-3 leading-relaxed text-pretty text-muted">
                Wera reads what each posting says about visas, and backs it with more than {thousands(s.h1b_filings)} certified
                H-1B filings from the US Department of Labor: how often a company files, for which titles, and what it offered people at your level.
              </p>
              <ul className="mt-8 border-b border-border text-sm">
                {[
                  'Filter to jobs that say they sponsor, and see the ones that file anyway.',
                  'Real offered wages by title, city and level, from the filings.',
                  'Look up any employer, even ones Wera does not watch.',
                ].map((t) => (
                  <li key={t} className="border-t border-border py-3 text-muted">{t}</li>
                ))}
              </ul>
            </div>
            <H1BMock className="md:ml-auto md:max-w-sm" />
          </div>
        </section>

        {/* Industries */}
        <section className="overflow-hidden py-24">
          <h2 className="px-4 text-center text-3xl font-semibold tracking-tight sm:text-4xl">From frontier AI to hospitals.</h2>
          <p className="mx-auto mt-3 max-w-xl px-4 text-center text-muted">
            {s.companies.toLocaleString('en-US')} companies across {s.industries} industries, checked every day.
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
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Fill the form. Keep the judgment.</h2>
              <p className="mt-3 leading-relaxed text-pretty text-muted">
                Save any job from any site, see its fit and sponsorship, attach the resume tailored to it, and let Wera fill the
                application, step by step on multi-page forms. Open questions get a draft in your voice. Wera never submits for you.
              </p>
              <Link to="/signup" className={clsx(CTA, 'mt-7')}>Create your account <ArrowRight className="size-4" /></Link>
              <p className="mt-3 text-xs text-faint">The Chrome extension is in private pilot and coming to the Chrome Web Store.</p>
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
      </main>

      <SiteFooter />
    </div>
  );
}
