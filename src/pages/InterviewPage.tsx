// Interview prep, by role. A track (Backend, Frontend, Data, ...) picks
// what to practice: work simulations told as emails, where each reply is
// rated and explained like a situational round's debrief, and rounds of
// questions from the domains that role's loop weighs, leaning toward the
// stack the user picks. Jobs the user is interviewing for sit on top with
// the topics Wera expects, a click from practicing for them.
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  ArrowRight, CalendarCheck, Flame, History, Lightbulb, LoaderCircle, Mail, Target,
} from 'lucide-react';
import {
  trackForTitle, useDomains, useScenarios, useStartQuiz, useTracks,
  type Difficulty, type DomainStat, type Practice, type Question, type ScenarioCard, type Track,
} from '../api/interview';
import { useJob, useJobs } from '../api/hooks';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { Quiz } from '../components/interview/Quiz';
import { PersonMark, ScenarioPlayer } from '../components/interview/ScenarioPlayer';
import { DifficultyPill } from '../components/interview/bits';
import { tagLabel } from '../components/interview/text';
import { errorMessage } from '../api/client';
import { useDocumentTitle } from '../lib/useDocumentTitle';

const DIFFS: { value: Difficulty | ''; label: string }[] = [
  { value: '', label: 'Mixed' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const TRACK_KEY = 'wera.interview.track';

function rememberedTrack(): string {
  try {
    return localStorage.getItem(TRACK_KEY) ?? '';
  } catch {
    return '';
  }
}

function rememberTrack(id: string) {
  try {
    localStorage.setItem(TRACK_KEY, id);
  } catch {
    // A private window: the track is picked again next time.
  }
}

/** The roles, as a row of tabs on one line (it scrolls sideways on a phone). */
function TrackBar({ tracks, value, suggested, onChange }: { tracks: Track[]; value: string; suggested: string; onChange: (id: string) => void }) {
  // On a phone the roles scroll sideways: the chosen one is brought into view, not left off screen.
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bar.current?.querySelector('[aria-checked="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }, [value]);
  // More roles off the right edge: the row fades out there, so it reads as a row that goes on.
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const check = () => setMore(el.scrollWidth - el.clientWidth - el.scrollLeft > 8);
    check();
    el.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      el.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [tracks.length]);
  return (
    <div ref={bar} role="radiogroup" aria-label="Role"
      style={more ? { maskImage: 'linear-gradient(to right, black calc(100% - 48px), transparent)' } : undefined}
      className="-mx-4 flex gap-0.5 overflow-x-auto border-b border-border px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      {tracks.map((t) => {
        const on = t.id === value;
        return (
          <button key={t.id} role="radio" aria-checked={on} onClick={() => onChange(t.id)}
            className={clsx('-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2 py-2.5 text-sm whitespace-nowrap transition-colors duration-150',
              on ? 'border-accent font-medium text-accent' : 'border-transparent text-muted hover:text-text')}>
            {t.label}
            {t.id === suggested && <span className={clsx('rounded-full px-1.5 text-[10px] font-semibold', on ? 'bg-accent/10' : 'bg-surface-2 text-faint')}>For you</span>}
          </button>
        );
      })}
    </div>
  );
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="flex items-center gap-1.5 text-xs text-muted">{icon}{label}</dt>
      <dd className="mt-0.5 flex items-baseline gap-2">
        <span className="font-mono text-xl font-semibold tabular-nums text-text">{value}</span>
        {hint && <span className="min-w-0 truncate text-[11px] text-faint">{hint}</span>}
      </dd>
    </div>
  );
}

/** Where the user stands in this track, as one quiet strip: the page's work is below it. */
function PracticeStats({ practice, domains, sims, track }: { practice?: Practice; domains: DomainStat[]; sims: ScenarioCard[]; track: Track }) {
  const inTrack = domains.filter((d) => track.domains.includes(d.domain));
  const answered = inTrack.reduce((a, d) => a + d.answered, 0);
  const right = inTrack.reduce((a, d) => a + d.correct, 0);
  const mine = sims.filter((s) => track.scenarios.includes(s.id));
  const done = mine.filter((s) => s.progress.best >= 0).length;
  const streak = practice?.streak ?? 0;
  return (
    <dl aria-label="Your practice" className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border lg:grid-cols-4">
      <Stat icon={<Flame className="size-3.5" />} label="Day streak" value={String(streak)} hint={streak ? 'practice today to keep it' : 'answer one to start'} />
      <Stat icon={<CalendarCheck className="size-3.5" />} label="This week" value={String(practice?.week ?? 0)} hint="answers and replies" />
      <Stat icon={<Target className="size-3.5" />} label="Accuracy" value={answered ? `${Math.round((right / answered) * 100)}%` : '-'}
        hint={answered ? `${right} of ${answered} in this role` : 'no answers yet'} />
      <Stat icon={<Mail className="size-3.5" />} label="Simulations" value={`${done}/${mine.length}`} hint="finished in this role" />
    </dl>
  );
}

function UpcomingJob({ id, title, company, onPractice }: { id: number; title: string; company: string; onPractice: (track: string) => void }) {
  const job = useJob(id);
  const topics = job.data?.deep?.raw.interview_topics ?? [];
  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Link to={`/jobs/${id}`} className="text-sm font-semibold text-text hover:text-accent">{title}</Link>
          <span className="text-xs text-muted">{company}</span>
        </div>
        {topics.length > 0 ? (
          <ul className="mt-1.5 space-y-1">
            {topics.slice(0, 3).map((t, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-snug text-muted">
                <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-accent" /><span className="line-clamp-2">{t}</span>
              </li>
            ))}
          </ul>
        ) : job.isLoading ? <Skeleton className="mt-2 h-8 w-3/4" /> : (
          <p className="mt-1 text-[13px] text-faint">Open the job for Wera&apos;s full review and the topics it expects.</p>
        )}
      </div>
      <button onClick={() => onPractice(trackForTitle(title))}
        className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text hover:border-accent/40 hover:text-accent">
        Practice for it <ArrowRight className="size-3.5" />
      </button>
    </li>
  );
}

/** Jobs the user is interviewing for: what each is likely to ask, and the role to practice for it. */
function Upcoming({ onPractice }: { onPractice: (track: string) => void }) {
  const jobs = useJobs({ status: 'interviewing', limit: 3 });
  const list = jobs.data?.jobs ?? [];
  if (!list.length) return null;
  return (
    <section aria-labelledby="upcoming" className="space-y-2.5">
      <h2 id="upcoming" className="text-base font-semibold text-text">Your interviews</h2>
      <ul className="divide-y divide-border rounded-card border border-border bg-surface">
        {list.map((j) => <UpcomingJob key={j.id} id={j.id} title={j.title} company={j.company} onPractice={onPractice} />)}
      </ul>
    </section>
  );
}

function SimCard({ s, onOpen }: { s: ScenarioCard; onOpen: () => void }) {
  const p = s.progress;
  const going = p.answered > 0 && p.answered < s.steps;
  return (
    <button onClick={onOpen}
      className="group block w-full rounded-card border border-border bg-surface p-4 text-left transition-colors duration-150 hover:border-accent/40">
      <span className="flex items-start gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-snug font-semibold text-text">{s.title}</span>
          <span className="mt-0.5 block text-xs text-muted">{s.role} · {s.steps} emails</span>
        </span>
        <DifficultyPill d={s.difficulty} />
      </span>
      <span className="mt-2 line-clamp-2 block text-[13px] leading-relaxed text-muted">{s.blurb}</span>
      <span className="mt-1.5 block truncate text-[11px] text-faint">Tests {s.skills.join(', ').toLowerCase()}</span>
      <span className="mt-3 flex items-center gap-2 border-t border-border pt-3">
        <span className="flex -space-x-1" title={s.cast.map((c) => `${c.name}, ${c.role}`).join('\n')}>
          {s.cast.slice(0, 4).map((c) => <span key={c.name} className="rounded-full ring-2 ring-surface"><PersonMark name={c.name} size="sm" /></span>)}
        </span>
        {going && (
          // How far the run got, an email a dot.
          <span className="flex gap-1" aria-hidden>
            {Array.from({ length: s.steps }, (_, i) => <span key={i} className={clsx('size-1.5 rounded-full', i < p.answered ? 'bg-accent' : 'bg-surface-2')} />)}
          </span>
        )}
        {!going && p.best >= 0 && <span className="text-[11px] text-faint tabular-nums">Best {p.best}/{s.max_points}</span>}
        <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-accent">
          {going ? `Continue ${p.answered}/${s.steps}` : p.best >= 0 ? 'Run it again' : 'Start'}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </button>
  );
}

function SectionHead({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 id={id} className="text-base font-semibold text-text">{title}</h2>
      <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{children}</p>
    </div>
  );
}

function Simulations({ sims, track, onOpen }: { sims: ScenarioCard[]; track: Track; onOpen: (id: string) => void }) {
  const mine = track.scenarios.map((id) => sims.find((s) => s.id === id)).filter((s): s is ScenarioCard => !!s);
  return (
    <section aria-labelledby="sims" className="space-y-3">
      <SectionHead id="sims" title="Work simulations">
        A few days on the job, told as emails. Pick a reply to each, then see how every option rates and why.
      </SectionHead>
      {mine.length ? (
        <div className="space-y-3">
          {mine.map((s) => <SimCard key={s.id} s={s} onOpen={() => onOpen(s.id)} />)}
        </div>
      ) : <p className="rounded-card border border-dashed border-border px-4 py-6 text-center text-sm text-muted">No simulations for this role yet.</p>}
    </section>
  );
}

/** One topic of a round: its name, how much of it is answered, and how much of that was right. */
function TopicRow({ d, on, onPick }: { d: DomainStat; on: boolean; onPick: () => void }) {
  const pct = d.questions ? Math.round((d.answered / d.questions) * 100) : 0;
  return (
    <button onClick={onPick} aria-pressed={on}
      className={clsx('flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150', on ? 'bg-accent/[0.06]' : 'hover:bg-surface-2/60')}>
      <span aria-hidden className={clsx('grid size-4 shrink-0 place-items-center rounded-full border', on ? 'border-accent' : 'border-border')}>
        {on && <span className="size-2 rounded-full bg-accent" />}
      </span>
      <span className={clsx('min-w-0 flex-1 truncate text-sm', on ? 'font-semibold text-text' : 'font-medium text-text')}>{d.domain || 'All topics'}</span>
      <span aria-hidden className="hidden h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-surface-2 sm:block lg:hidden xl:block">
        <span className="block h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${pct}%` }} />
      </span>
      <span className="w-24 shrink-0 text-right text-[11px] text-muted tabular-nums">{d.answered}/{d.questions} answered</span>
      <span className="w-16 shrink-0 text-right text-[11px] text-faint tabular-nums">{d.answered > 0 ? `${Math.round((d.correct / d.answered) * 100)}% right` : ''}</span>
    </button>
  );
}

function Rounds({ track, domains, practice, starting, onStart }: {
  track: Track; domains: DomainStat[]; practice?: Practice; starting: boolean;
  onStart: (v: { domain: string; difficulty: Difficulty | ''; stack: string[]; missed?: boolean }) => void;
}) {
  const [domain, setDomain] = useState('');
  const [diff, setDiff] = useState<Difficulty | ''>('');
  const [stack, setStack] = useState<string[]>([]);
  const list = track.domains.map((d) => domains.find((x) => x.domain === d)).filter((d): d is DomainStat => !!d);
  const all: DomainStat = { domain: '', kind: 'technical', questions: list.reduce((a, d) => a + d.questions, 0), answered: list.reduce((a, d) => a + d.answered, 0), correct: list.reduce((a, d) => a + d.correct, 0) };
  const tags = track.stack.slice(0, 10);
  const toggle = (t: string) => setStack((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));
  const missed = practice?.missed ?? 0;
  return (
    <section aria-labelledby="rounds" className="space-y-3">
      <SectionHead id="rounds" title="Question rounds">
        Ten quick questions on what this role&apos;s interviews cover, new ones first. Pick a topic, or take them all.
      </SectionHead>
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <div role="group" aria-label="Topic" className="divide-y divide-border">
          {[all, ...list].map((d) => <TopicRow key={d.domain || 'all'} d={d} on={domain === d.domain} onPick={() => setDomain(d.domain)} />)}
        </div>
        <div className="space-y-3 border-t border-border bg-surface-2/40 p-4">
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 w-full text-xs font-medium text-muted sm:w-auto" title="Questions on these come first">Your stack</span>
              {tags.map((t) => {
                const on = stack.includes(t.tag);
                return (
                  <button key={t.tag} onClick={() => toggle(t.tag)} aria-pressed={on}
                    className={clsx('rounded-full border px-2.5 py-1 text-xs transition-colors',
                      on ? 'border-accent/50 bg-accent/10 font-medium text-accent' : 'border-border bg-surface text-muted hover:text-text')}>
                    {tagLabel(t.tag)}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
            <span className="text-xs font-medium text-muted">Difficulty</span>
            <div role="radiogroup" aria-label="Difficulty" className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
              {DIFFS.map((d) => (
                <button key={d.label} role="radio" aria-checked={diff === d.value} onClick={() => setDiff(d.value)}
                  className={clsx('rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200',
                    diff === d.value ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text')}>
                  {d.label}
                </button>
              ))}
            </div>
            <div className="flex w-full flex-wrap justify-end gap-2 sm:ml-auto sm:w-auto">
              {missed > 0 && (
                <button onClick={() => onStart({ domain: '', difficulty: '', stack: [], missed: true })} disabled={starting}
                  title="The questions you last answered wrong"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text hover:border-accent/40 hover:text-accent disabled:opacity-60 sm:flex-none">
                  <History className="size-4" /> Review {missed} missed
                </button>
              )}
              <button onClick={() => onStart({ domain, difficulty: diff, stack })} disabled={starting}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg hover:bg-accent/85 disabled:opacity-60 sm:flex-none">
                {starting ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />} Start 10 questions
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function InterviewPage() {
  useDocumentTitle('Interview prep');
  const [sp, setSp] = useSearchParams();
  const tracks = useTracks();
  const domains = useDomains();
  const sims = useScenarios();
  const start = useStartQuiz();
  const [quiz, setQuiz] = useState<Question[] | null>(null);

  const list = tracks.data?.tracks ?? [];
  const suggested = tracks.data?.suggested ?? '';
  const want = sp.get('track') || rememberedTrack() || suggested;
  const trackId = list.some((t) => t.id === want) ? want : list[0]?.id ?? '';
  const track = list.find((t) => t.id === trackId);
  const sim = sp.get('sim');

  // Opening a simulation or a round is a step in the history, so the browser's Back
  // returns to the practice page. Closing one replaces that step: Back does not reopen it.
  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(sp);
    if (v) next.set(k, v);
    else next.delete(k);
    setSp(next, { replace: k === 'track' || v === null });
  };
  const round = sp.get('round') === '1';
  // A round lives in this page's memory: a reload, or a link to one, has none to show.
  const stale = round && !quiz?.length;
  useEffect(() => {
    if (!stale) return;
    const next = new URLSearchParams(sp);
    next.delete('round');
    setSp(next, { replace: true });
  }, [stale, sp, setSp]);
  const pickTrack = (id: string) => {
    rememberTrack(id);
    setParam('track', id);
  };

  const header = (
    <header className="mb-5">
      <h1 className="text-[28px] leading-tight font-semibold">Interview prep</h1>
      <p className="mt-1 text-sm text-muted">Practice for the interviews your role gets: question rounds for your stack, and work simulations told as emails.</p>
    </header>
  );

  if (sim) {
    return (
      <div className="mx-auto max-w-3xl pb-10">
        <ScenarioPlayer key={sim} id={sim} onDone={() => setParam('sim', null)} />
      </div>
    );
  }
  if (quiz?.length && round) {
    return (
      <div className="mx-auto max-w-2xl pb-10">
        <Quiz key={quiz[0].id} questions={quiz} onDone={() => { setQuiz(null); setParam('round', null); }} />
      </div>
    );
  }
  if (tracks.isLoading || domains.isLoading) {
    return <div className="mx-auto max-w-6xl pb-10">{header}<Skeleton className="h-96 w-full" /></div>;
  }
  const failed = tracks.isLoadingError ? tracks : domains.isLoadingError ? domains : null;
  if (failed) {
    return <div className="mx-auto max-w-6xl pb-10">{header}<ErrorState message={String(failed.error)} onRetry={() => void failed.refetch()} /></div>;
  }
  if (!track) return <div className="mx-auto max-w-6xl pb-10">{header}<EmptyState title="Practice is on its way" hint="Check back soon." /></div>;
  const d = domains.data?.domains ?? [];
  const s = sims.data?.scenarios ?? [];
  // Top to bottom: who you are practicing as, where you stand, the interviews you have
  // coming, then the two ways to practice side by side.
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div>
        {header}
        <TrackBar tracks={list} value={trackId} suggested={suggested} onChange={pickTrack} />
        <p className="mt-3 text-[13px] text-muted">{track.blurb}</p>
      </div>
      <PracticeStats practice={domains.data?.practice} domains={d} sims={s} track={track} />
      <Upcoming onPractice={pickTrack} />
      <div className="grid grid-cols-1 items-start gap-x-6 gap-y-8 lg:grid-cols-5">
        {/* min-w-0: a long line that must not wrap (a card's skills) may not widen the column past the screen. */}
        <div className="min-w-0 space-y-3 lg:col-span-3">
          <Rounds key={track.id} track={track} domains={d} practice={domains.data?.practice} starting={start.isPending}
            onStart={(v) => start.mutate({ ...v, track: track.id }, {
              onSuccess: (r) => {
                setQuiz(r.questions);
                if (r.questions.length) setParam('round', '1');
              },
            })} />
          {start.isError ? <p role="alert" className="text-sm text-bad">{errorMessage(start.error, 'Could not start a round. Check your connection and try again.')}</p>
            : quiz && !quiz.length && <p role="status" className="text-sm text-muted">No questions match that choice yet. Try another difficulty or stack.</p>}
        </div>
        <div className="min-w-0 lg:col-span-2">
          {sims.isLoading ? <Skeleton className="h-56 w-full" /> : <Simulations sims={s} track={track} onOpen={(id) => setParam('sim', id)} />}
        </div>
      </div>
    </div>
  );
}
