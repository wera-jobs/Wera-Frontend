import '@fontsource-variable/newsreader';
import '@fontsource-variable/newsreader/wght-italic.css';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowRight, Check } from 'lucide-react';
import { api } from '../api/client';
import { Logo } from '../components/Logo';
import { compact } from '../lib/format';
import { ThemeToggle, useTheme } from '../lib/theme';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { usePublicPage } from '../lib/usePublicPage';
import { AfterTheMatch } from './AfterTheMatch';
import { ExtensionPreview } from './ExtensionPreview';
import { FaqSection } from './FaqSection';
import { JobsAddedToday } from './JobsAddedToday';
import { SiteFooter } from './SiteFooter';
import { SponsorLookup } from './SponsorLookup';

interface Stats {
  companies: number;
  industries: number;
  open_jobs: number;
  h1b_filings: number;
  h1b_employers: number;
}

/** Shown until the live numbers arrive, or if the server is away. */
const ROUGH_STATS: Stats = { companies: 5100, industries: 30, open_jobs: 500_000, h1b_filings: 495_000, h1b_employers: 58_000 };

const HERO_VIEWS = [
  { id: 'tailor', label: 'Tailored match', caption: 'Every posting scored against your resume, with keyword coverage and plain reasons.' },
  { id: 'resume', label: 'Resume editor', caption: 'Edit your resume as a structured form beside a live one-page PDF and LaTeX preview.' },
  { id: 'tracker', label: 'Tracker', caption: 'Keep saved, applied, interviewing, and offer stages in one place instead of a spreadsheet.' },
] as const;

const STEPS = [
  {
    n: '01',
    title: 'Bring your resume',
    body: 'Upload a PDF or build from scratch. Set the roles, locations, and work authorization you want; Wera drafts your profile and you stay in control.',
  },
  {
    n: '02',
    title: 'Wera reads the career pages',
    body: 'Every day, Wera checks thousands of company career boards directly, filters out roles that do not match your level or places, and scores the rest from 0 to 100.',
  },
  {
    n: '03',
    title: 'Tailor and apply',
    body: 'Generate a one-page resume copy and cover letter grounded in your real experience, then let the Chrome extension fill multi-page forms. You always press submit.',
  },
];

const SECTORS: { name: string; examples: string }[] = [
  { name: 'AI & ML', examples: 'Frontier labs, applied AI, ML infra' },
  { name: 'Big Tech', examples: 'Core systems, consumer, hardware' },
  { name: 'Cloud & DevTools', examples: 'Databases, observability, developer platforms' },
  { name: 'Fintech & Trading', examples: 'Payments, banking infra, quant research' },
  { name: 'Healthcare & Biotech', examples: 'Hospitals, clinical tech, computational bio' },
  { name: 'Robotics & Aerospace', examples: 'Autonomy, flight software, defense' },
  { name: 'Cybersecurity', examples: 'Cloud security, threat intel, identity' },
  { name: 'Enterprise & Consumer', examples: 'B2B SaaS, logistics, energy, media' },
];

const STANDARDS = [
  {
    title: 'Never invents experience',
    body: 'Resume tailoring only reorders and rewords what is already on your resume. No fabricated metrics, roles, or skills.',
  },
  {
    title: 'Never submits without you',
    body: 'Mass auto-applying hurts candidates. Wera fills the application and hands it back to you to review and press submit.',
  },
  {
    title: 'Direct from company career pages',
    body: 'Roles come straight from employer hiring boards, so closed and stale aggregator reposts drop out quickly.',
  },
  {
    title: 'Public Department of Labor data',
    body: 'Offered wage ranges and H-1B sponsorship histories come from certified US DOL LCA disclosures, not guesswork.',
  },
];

const CTA = 'inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-bg transition-colors hover:bg-accent/90';
const GHOST = 'inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-medium text-text transition-colors hover:border-text/30';

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-mono text-xl font-semibold tracking-tight text-text sm:text-2xl">{value}</div>
      <div className="mt-0.5 text-xs text-faint">{label}</div>
    </div>
  );
}

/** The public front page: what Wera is, for visitors who are not signed in. */
export default function LandingPage() {
  useDocumentTitle('Wera: find jobs that fit you', false);
  usePublicPage('/');
  const { theme } = useTheme();
  const [heroTab, setHeroTab] = useState(0);
  const stats = useQuery({ queryKey: ['public-stats'], queryFn: () => api<Stats>('/api/public/stats'), staleTime: 10 * 60_000 });
  const s = stats.data ?? ROUGH_STATS;
  const activeHero = HERO_VIEWS[heroTab];

  return (
    <div className="landing-colors min-h-svh overflow-x-clip bg-bg text-text">
      <a href="#main" className="sr-only rounded-lg bg-surface px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50">
        Skip to content
      </a>

      {/* Navigation */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-bg/90 backdrop-blur-sm">
        <nav className="mx-auto flex h-15 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" aria-label="Wera home"><Logo /></Link>
          <div className="hidden items-center gap-6 text-sm text-muted md:flex">
            <a href="#how" className="transition-colors hover:text-text">How it works</a>
            <a href="#jobs-today" className="transition-colors hover:text-text">Jobs</a>
            <a href="#features" className="transition-colors hover:text-text">Features</a>
            <a href="#pay-and-visas" className="transition-colors hover:text-text">Pay &amp; visas</a>
            <a href="#faq" className="transition-colors hover:text-text">FAQ</a>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login" className="rounded-lg px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:text-text sm:px-3">Log in</Link>
            <Link to="/signup" className="rounded-lg bg-text px-3.5 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90">Get started</Link>
          </div>
        </nav>
      </header>

      <main id="main">
        {/* Hero: asymmetric editorial split with real product screen above the fold */}
        <section className="mx-auto max-w-6xl px-4 pt-12 pb-20 sm:px-6 sm:pt-16 lg:pt-20 lg:pb-24">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
            <div>
              <p className="font-mono text-xs tracking-wider text-faint uppercase">Direct from company career pages</p>
              <h1 className="font-display mt-4 text-[2.75rem] leading-[1.06] font-normal tracking-[-0.025em] text-balance text-text sm:text-5xl lg:text-[3.5rem]">
                Find the jobs that fit you.{' '}
                <em className="text-accent italic">Skip the noise.</em>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-muted">
                Wera watches {s.companies.toLocaleString()} company career pages every day, scores open roles against your resume
                with plain reasons, and pairs every employer with real US wage and H-1B sponsorship data.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link to="/signup" className={CTA}>Get started, it's free <ArrowRight className="size-4" /></Link>
                <a href="#how" className={GHOST}>See how it works</a>
              </div>
              <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-6 sm:grid-cols-4">
                <Stat value={s.companies.toLocaleString()} label="Companies" />
                <Stat value={compact(s.open_jobs)} label="Open jobs" />
                <Stat value={String(s.industries)} label="Industries" />
                <Stat value={compact(s.h1b_filings)} label="DOL filings" />
              </div>
            </div>

            {/* Real product UI preview */}
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border bg-surface-2/60 px-3 py-2">
                <div className="flex items-center gap-1" role="tablist" aria-label="Product preview">
                  {HERO_VIEWS.map((view, i) => (
                    <button
                      key={view.id}
                      type="button"
                      role="tab"
                      aria-selected={heroTab === i}
                      onClick={() => setHeroTab(i)}
                      className={clsx(
                        'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                        heroTab === i ? 'bg-surface text-text shadow-xs' : 'text-muted hover:text-text',
                      )}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>
                <span className="hidden font-mono text-[11px] text-faint sm:inline">wera-jobs.com</span>
              </div>
              <div className="relative aspect-[16/10] overflow-hidden bg-surface">
                {HERO_VIEWS.map((view, i) => (
                  <img
                    key={view.id}
                    src={`/landing/${view.id}-wide-${theme}.webp`}
                    alt={i === heroTab ? `Wera ${view.label.toLowerCase()} screen` : ''}
                    aria-hidden={i !== heroTab}
                    decoding="async"
                    className={clsx(
                      'absolute inset-0 h-full w-full object-contain object-top transition-opacity duration-200',
                      i === heroTab ? 'opacity-100' : 'pointer-events-none opacity-0',
                    )}
                  />
                ))}
              </div>
              <p className="border-t border-border px-4 py-2.5 text-xs text-muted">{activeHero.caption}</p>
            </div>
          </div>
        </section>

        {/* How it works: clean 3-column hairline strip */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 border-t border-border px-4 py-20 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <p className="font-mono text-xs tracking-wider text-faint uppercase">How it works</p>
            <h2 className="font-display mt-3 text-3xl font-normal tracking-[-0.02em] sm:text-4xl">
              Three minutes to set up. Then it works every day.
            </h2>
          </div>
          <div className="mt-12 grid grid-cols-1 divide-y divide-border border-y border-border md:grid-cols-3 md:divide-x md:divide-y-0">
            {STEPS.map((step) => (
              <div key={step.n} className="py-7 md:px-7 md:first:pl-0 md:last:pr-0">
                <span className="font-mono text-xs text-accent">{step.n}</span>
                <h3 className="mt-3 text-base font-semibold text-text">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Jobs added today: real company marks and roles across industries */}
        <JobsAddedToday openJobs={compact(s.open_jobs)} companies={s.companies.toLocaleString()} />

        {/* Features: real screenshots beside an interactive list */}
        <AfterTheMatch />

        {/* Pay & sponsorship data: useful for every jobseeker, essential for international candidates */}
        <section id="pay-and-visas" className="scroll-mt-16 border-t border-border bg-surface/40">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <div>
              <p className="font-mono text-xs tracking-wider text-faint uppercase">Pay &amp; visa transparency</p>
              <h2 className="font-display mt-3 text-3xl font-normal tracking-[-0.02em] sm:text-4xl">
                Real offered wages, and clear sponsorship history.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
                Every US job seeker deserves real pay ranges before spending an hour on an application, and international
                candidates shouldn't have to guess who actually sponsors. Wera pairs each posting with{' '}
                {compact(s.h1b_filings)} certified US Department of Labor filings across {compact(s.h1b_employers)} employers.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-muted">
                {[
                  'See real base-salary ranges by title, city, and level from public LCA filings.',
                  'Read sponsorship wording directly from each posting, backed by historical filing volume.',
                  'Look up any US employer inside Wera, even companies you find outside your feed.',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-good" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <SponsorLookup totalEmployers={compact(s.h1b_employers)} />
          </div>
        </section>

        {/* Market coverage: calm editorial directory */}
        <section className="mx-auto max-w-6xl border-t border-border px-4 py-20 sm:px-6 sm:py-24">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-xs tracking-wider text-faint uppercase">Coverage</p>
              <h2 className="font-display mt-3 text-3xl font-normal tracking-[-0.02em] sm:text-4xl">
                From frontier AI to hospitals.
              </h2>
            </div>
            <p className="max-w-md text-sm text-muted">
              {s.companies.toLocaleString()} company career pages across {s.industries} industries, checked daily so you see roles right when they open.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {SECTORS.map((sec) => (
              <div key={sec.name} className="bg-surface p-5">
                <div className="text-sm font-semibold text-text">{sec.name}</div>
                <p className="mt-1 text-xs leading-relaxed text-muted">{sec.examples}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Chrome extension */}
        <section id="extension" className="mx-auto max-w-6xl scroll-mt-20 border-t border-border px-4 py-20 sm:px-6 sm:py-24">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div>
              <p className="font-mono text-xs tracking-wider text-faint uppercase">Chrome extension</p>
              <h2 className="font-display mt-3 text-3xl font-normal tracking-[-0.02em] sm:text-4xl">
                Fill the form. Keep the judgment.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
                Save any posting from any site, check your fit score, attach your tailored resume, and let Wera fill
                multi-page forms across Workday, Greenhouse, Lever, Ashby, iCIMS, Oracle, and more. Open questions get a
                draft in your voice; consents and submit stay with you.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link to="/signup" className={CTA}>Create your account <ArrowRight className="size-4" /></Link>
              </div>
              <p className="mt-3 text-xs text-faint">In private pilot and coming to the Chrome Web Store.</p>
            </div>
            <ExtensionPreview />
          </div>
        </section>

        {/* Honest standards: what Wera won't do */}
        <section className="border-t border-border bg-surface/40">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <div className="max-w-xl">
              <p className="font-mono text-xs tracking-wider text-faint uppercase">Our standards</p>
              <h2 className="font-display mt-3 text-3xl font-normal tracking-[-0.02em] sm:text-4xl">
                What Wera won't do.
              </h2>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-8 border-t border-border pt-10 sm:grid-cols-2">
              {STANDARDS.map((item) => (
                <div key={item.title}>
                  <h3 className="text-base font-semibold text-text">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Q&A */}
        <FaqSection />

        {/* Grounded closing CTA */}
        <section className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-4 py-20 sm:px-6 md:flex-row md:items-center">
            <div>
              <h2 className="font-display text-3xl font-normal tracking-[-0.02em] text-text sm:text-4xl">
                Your next role is already posted.
              </h2>
              <p className="mt-2 text-base text-muted">
                Let Wera watch the career pages while you focus on the applications that matter.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/signup" className={CTA}>Get started, it's free <ArrowRight className="size-4" /></Link>
              <Link to="/login" className={GHOST}>I have an account</Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
