// Interview prep, by role. A track (Backend, Frontend, Data, ...) picks
// what to practice: work simulations told as emails, where each reply is
// rated and explained like a situational round's debrief, and rounds of
// questions from the domains that role's loop weighs, leaning toward the
// stack the user picks. Jobs the user is interviewing for sit on top with
// the topics Wera expects, a click from practicing for them.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  ArrowRight, CalendarCheck, Flame, History, Lightbulb, LoaderCircle, Mail, Target,
} from 'lucide-react';
import {
  trackForTitle, useDomains, useScenarios, useStartQuiz, useTracks,
  type Difficulty, type DomainStat, type Practice, type Question, type ScenarioCard, type Track,
} from '../api/interview';
import { useInterviewPrep, useJob, useJobs } from '../api/hooks';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { Quiz } from '../components/interview/Quiz';
import { PersonMark, ScenarioPlayer } from '../components/interview/ScenarioPlayer';
import { DifficultyPill } from '../components/interview/bits';
import { tagLabel } from '../components/interview/text';
import { upNext, type Next } from '../components/interview/next';
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

type RoundStart = { domain: string; difficulty: Difficulty | ''; stack: string[]; missed?: boolean };

/** The role being practiced: a plain select, the page's one setting that changes everything below it. */
function RolePicker({ tracks, value, suggested, onChange }: { tracks: Track[]; value: string; suggested: string; onChange: (id: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="shrink-0 text-muted">Practicing for</span>
      <select aria-label="Role" value={value} onChange={(e) => onChange(e.target.value)}
        className="min-w-0 rounded-lg border border-border bg-surface py-1.5 pr-8 pl-3 text-sm font-medium text-text hover:border-accent/40 focus:border-accent/60">
        {tracks.map((t) => <option key={t.id} value={t.id}>{t.label}{t.id === suggested ? ' (for you)' : ''}</option>)}
      </select>
    </label>
  );
}

/** Where the user stands, in one line under the title. */
function ProgressLine({ practice, domains, track }: { practice?: Practice; domains: DomainStat[]; track: Track }) {
  const inTrack = domains.filter((d) => track.domains.includes(d.domain));
  const answered = inTrack.reduce((a, d) => a + d.answered, 0);
  const right = inTrack.reduce((a, d) => a + d.correct, 0);
  const streak = practice?.streak ?? 0;
  return (
    <ul aria-label="Your practice" className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-muted">
      <li className="inline-flex items-center gap-1.5"><Flame className={clsx('size-3.5', streak ? 'text-accent' : 'text-faint')} />
        <span><b className="font-semibold text-text tabular-nums">{streak}</b>-day streak</span></li>
      <li className="inline-flex items-center gap-1.5"><CalendarCheck className="size-3.5 text-faint" />
        <span><b className="font-semibold text-text tabular-nums">{practice?.week ?? 0}</b> answers this week</span></li>
      <li className="inline-flex items-center gap-1.5"><Target className="size-3.5 text-faint" />
        <span>{answered ? <><b className="font-semibold text-text tabular-nums">{Math.round((right / answered) * 100)}%</b> right in this role</> : 'No answers in this role yet'}</span></li>
    </ul>
  );
}

/** One card with the next step, so the page never opens on a wall of choices. */
function UpNext({ next, starting, onStart, onOpenSim }: { next: Next; starting: boolean; onStart: (v: RoundStart) => void; onOpenSim: (id: string) => void }) {
  const [title, detail, action, go, Icon] =
    next.kind === 'sim' ? [`Finish "${next.sim.title}"`, `You stopped at email ${next.sim.progress.answered + 1} of ${next.sim.steps}.`, 'Continue', () => onOpenSim(next.sim.id), Mail] as const
    : next.kind === 'missed' ? [`Review ${next.count} question${next.count === 1 ? '' : 's'} you missed`, 'Questions you last answered wrong come back until you get them right.', 'Review', () => onStart({ domain: '', difficulty: '', stack: [], missed: true }), History] as const
    : next.kind === 'topic' ? [`Practice ${next.domain.domain}`, next.domain.answered ? `${next.domain.questions - next.domain.answered} questions left, ${Math.round((next.domain.correct / next.domain.answered) * 100)}% right so far.` : `${next.domain.questions} questions you have not seen yet.`, 'Start 10 questions', () => onStart({ domain: next.domain.domain, difficulty: '', stack: [] }), Target] as const
    : [`Try "${next.sim.title}"`, `${next.sim.steps} emails: ${next.sim.blurb}`, 'Start', () => onOpenSim(next.sim.id), Mail] as const;
  return (
    <section aria-labelledby="next" className="flex flex-col gap-4 rounded-card border border-accent/25 bg-accent/[0.05] p-5 sm:flex-row sm:items-center">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent"><Icon className="size-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-accent">Up next</p>
        <h2 id="next" className="mt-0.5 text-base font-semibold text-text">{title}</h2>
        <p className="mt-0.5 line-clamp-2 text-[13px] text-muted">{detail}</p>
      </div>
      <button onClick={go} disabled={starting}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg hover:bg-accent/85 disabled:opacity-60">
        {starting ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />} {action}
      </button>
    </section>
  );
}

function UpcomingJob({ id, title, company, onPractice }: { id: number; title: string; company: string; onPractice: (track: string) => void }) {
  const job = useJob(id);
  // The questions from the job's interview prep, once written; before
  // that, the topics from Wera's review of the posting.
  const prep = useInterviewPrep(id);
  const asked = prep.data?.prep.questions.map((q) => q.question) ?? [];
  const topics = asked.length ? asked : job.data?.deep?.raw.interview_topics ?? [];
  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Link to={`/jobs?job=${id}&tab=prep`} className="text-sm font-semibold text-text hover:text-accent">{title}</Link>
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
        ) : job.isLoading || prep.isLoading ? <Skeleton className="mt-2 h-8 w-3/4" /> : (
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
      <h2 id="upcoming" className="text-sm font-semibold text-text">Your interviews</h2>
      <ul className="divide-y divide-border rounded-card border border-border bg-surface">
        {list.map((j) => <UpcomingJob key={j.id} id={j.id} title={j.title} company={j.company} onPractice={onPractice} />)}
      </ul>
    </section>
  );
}

const KIND: Record<string, string> = { technical: 'Technical', behavioral: 'Behavioral', product: 'Product' };

/** A topic as a row: how far along it is, and one button to practice it. */
function TopicRow({ name, sub, d, starting, onStart }: { name: string; sub: string; d: DomainStat; starting: boolean; onStart: () => void }) {
  const pct = d.questions ? Math.round((d.answered / d.questions) * 100) : 0;
  return (
    <li className="flex items-center gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">{name}</p>
        <p className="mt-0.5 text-xs text-muted tabular-nums">
          {sub} · {d.answered}/{d.questions} answered{d.answered > 0 && ` · ${Math.round((d.correct / d.answered) * 100)}% right`}
        </p>
      </div>
      <span aria-hidden className="hidden h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-surface-2 sm:block">
        <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </span>
      <button onClick={onStart} disabled={starting} aria-label={`Start 10 questions: ${name}`}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text hover:border-accent/40 hover:text-accent disabled:opacity-60">
        Start <ArrowRight className="size-3.5" />
      </button>
    </li>
  );
}

function Rounds({ track, domains, practice, starting, onStart }: {
  track: Track; domains: DomainStat[]; practice?: Practice; starting: boolean; onStart: (v: RoundStart) => void;
}) {
  const [diff, setDiff] = useState<Difficulty | ''>('');
  const [stack, setStack] = useState<string[]>([]);
  const list = track.domains.map((d) => domains.find((x) => x.domain === d)).filter((d): d is DomainStat => !!d);
  const all: DomainStat = { domain: '', kind: 'technical', questions: list.reduce((a, d) => a + d.questions, 0), answered: list.reduce((a, d) => a + d.answered, 0), correct: list.reduce((a, d) => a + d.correct, 0) };
  const tags = track.stack.slice(0, 10);
  const toggle = (t: string) => setStack((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));
  const missed = practice?.missed ?? 0;
  const start = (domain: string) => onStart({ domain, difficulty: diff, stack });
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted">Ten multiple-choice questions at a time, new ones first, each with the reasoning behind the answer.</p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-card border border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted">Difficulty</span>
          <div role="radiogroup" aria-label="Difficulty" className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
            {DIFFS.map((d) => (
              <button key={d.label} role="radio" aria-checked={diff === d.value} onClick={() => setDiff(d.value)}
                className={clsx('rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150',
                  diff === d.value ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text')}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
        {tags.length > 0 && (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-xs font-medium text-muted" title="Questions on what you pick come first">Your stack first</span>
            {tags.map((t) => {
              const on = stack.includes(t.tag);
              return (
                <button key={t.tag} onClick={() => toggle(t.tag)} aria-pressed={on}
                  className={clsx('rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                    on ? 'border-accent/50 bg-accent/10 font-medium text-accent' : 'border-border text-muted hover:text-text')}>
                  {tagLabel(t.tag)}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <ul aria-label="Topics" className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {missed > 0 && (
          <li className="flex items-center gap-4 bg-warn/[0.05] px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text">Questions you missed</p>
              <p className="mt-0.5 text-xs text-muted">{missed} to try again, until you get them right</p>
            </div>
            <button onClick={() => onStart({ domain: '', difficulty: '', stack: [], missed: true })} disabled={starting}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text hover:border-accent/40 hover:text-accent disabled:opacity-60">
              <History className="size-3.5" /> Review {missed} missed
            </button>
          </li>
        )}
        <TopicRow name="All topics" sub="A mix of this role's topics" d={all} starting={starting} onStart={() => start('')} />
        {list.map((d) => <TopicRow key={d.domain} name={d.domain} sub={KIND[d.kind] ?? 'Technical'} d={d} starting={starting} onStart={() => start(d.domain)} />)}
      </ul>
    </div>
  );
}

function SimRow({ s, onOpen }: { s: ScenarioCard; onOpen: () => void }) {
  const p = s.progress;
  const going = p.answered > 0 && p.answered < s.steps;
  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-text">{s.title}</p>
          <DifficultyPill d={s.difficulty} />
        </div>
        <p className="mt-0.5 text-xs text-muted">{s.role} · {s.steps} emails{p.best >= 0 && !going ? ` · best ${p.best}/${s.max_points}` : ''}</p>
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted">{s.blurb}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="flex -space-x-1" title={s.cast.map((c) => `${c.name}, ${c.role}`).join('\n')}>
            {s.cast.slice(0, 4).map((c) => <span key={c.name} className="rounded-full ring-2 ring-surface"><PersonMark name={c.name} size="sm" /></span>)}
          </span>
          <span className="truncate text-[11px] text-faint">Tests {s.skills.join(', ').toLowerCase()}</span>
        </div>
      </div>
      <button onClick={onOpen} aria-label={`${going ? 'Continue' : p.best >= 0 ? 'Run again' : 'Start'}: ${s.title}`}
        className={clsx('inline-flex shrink-0 items-center justify-center gap-1 self-start rounded-lg px-3 py-1.5 text-xs font-medium sm:self-center',
          going ? 'bg-accent text-bg hover:bg-accent/85' : 'border border-border text-text hover:border-accent/40 hover:text-accent')}>
        {going ? `Continue ${p.answered}/${s.steps}` : p.best >= 0 ? 'Run again' : 'Start'} <ArrowRight className="size-3.5" />
      </button>
    </li>
  );
}

function Simulations({ sims, track, onOpen }: { sims: ScenarioCard[]; track: Track; onOpen: (id: string) => void }) {
  const mine = track.scenarios.map((id) => sims.find((s) => s.id === id)).filter((s): s is ScenarioCard => !!s);
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted">A few days on the job, told as emails from your team. Pick a reply to each, then see how every option rates and why.</p>
      {mine.length ? (
        <ul aria-label="Simulations" className="divide-y divide-border rounded-card border border-border bg-surface">
          {mine.map((s) => <SimRow key={s.id} s={s} onOpen={() => onOpen(s.id)} />)}
        </ul>
      ) : <p className="rounded-card border border-dashed border-border px-4 py-8 text-center text-sm text-muted">No simulations for this role yet.</p>}
    </div>
  );
}

/** The two ways to practice, one at a time. */
function PracticeTabs({ tab, onTab, rounds, sims }: { tab: 'rounds' | 'sims'; onTab: (t: 'rounds' | 'sims') => void; rounds: number; sims: number }) {
  const item = (id: 'rounds' | 'sims', label: string, n: number) => (
    <button role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} onClick={() => onTab(id)}
      className={clsx('-mb-px inline-flex items-center gap-2 border-b-2 px-1 py-2.5 text-sm font-medium transition-colors duration-150',
        tab === id ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text')}>
      {label}
      <span className={clsx('rounded-full px-1.5 text-[11px] tabular-nums', tab === id ? 'bg-accent/10 text-accent' : 'bg-surface-2 text-faint')}>{n}</span>
    </button>
  );
  return (
    <div role="tablist" aria-label="Practice" className="flex gap-6 border-b border-border">
      {item('rounds', 'Question rounds', rounds)}
      {item('sims', 'Work simulations', sims)}
    </div>
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
  /** Practice for an interview: its role's rounds, scrolled to (the same role included). */
  const practiceFor = (id: string) => {
    pickTrack(id);
    window.setTimeout(() => document.getElementById('practice')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const header = (
    <header className="mb-5">
      <h1 className="text-[28px] leading-tight font-semibold">Interview prep</h1>
    </header>
  );
  const tab = sp.get('tab') === 'sims' ? 'sims' : 'rounds';

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
    return <div className="mx-auto max-w-4xl pb-10">{header}<Skeleton className="h-96 w-full" /></div>;
  }
  const failed = tracks.isLoadingError ? tracks : domains.isLoadingError ? domains : null;
  if (failed) {
    return <div className="mx-auto max-w-4xl pb-10">{header}<ErrorState message={errorMessage(failed.error)} onRetry={() => void failed.refetch()} /></div>;
  }
  if (!track) return <div className="mx-auto max-w-4xl pb-10">{header}<EmptyState title="Practice is on its way" hint="Check back soon." /></div>;
  const d = domains.data?.domains ?? [];
  const s = sims.data?.scenarios ?? [];
  const startRound = (v: RoundStart) => start.mutate({ ...v, track: track.id }, {
    onSuccess: (r) => {
      setQuiz(r.questions);
      if (r.questions.length) setParam('round', '1');
    },
  });
  const next = upNext(track, d, s, domains.data?.practice);
  const mineSims = track.scenarios.filter((id) => s.some((x) => x.id === id)).length;
  // Top to bottom: the role and where the user stands, what to do next, then the two ways to
  // practice one at a time. One column, so the eye goes down the page and never across it.
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <header className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h1 className="text-[28px] leading-tight font-semibold">Interview prep</h1>
            <p className="mt-1 text-sm text-muted">{track.blurb}</p>
          </div>
          <RolePicker tracks={list} value={trackId} suggested={suggested} onChange={pickTrack} />
        </div>
        <ProgressLine practice={domains.data?.practice} domains={d} track={track} />
      </header>
      <Upcoming onPractice={practiceFor} />
      {next && <UpNext next={next} starting={start.isPending} onStart={startRound} onOpenSim={(id) => setParam('sim', id)} />}
      {start.isError ? <p role="alert" className="text-sm text-bad">{errorMessage(start.error, 'Could not start a round. Check your connection and try again.')}</p>
        : quiz && !quiz.length && <p role="status" className="text-sm text-muted">No questions match that choice yet. Try another difficulty or stack.</p>}
      <section id="practice" aria-label="Practice" className="scroll-mt-16 space-y-4">
        <PracticeTabs tab={tab} onTab={(t) => setParam('tab', t === 'rounds' ? null : t)} rounds={track.domains.length} sims={mineSims} />
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'rounds'
            ? <Rounds key={track.id} track={track} domains={d} practice={domains.data?.practice} starting={start.isPending} onStart={startRound} />
            : sims.isLoading ? <Skeleton className="h-56 w-full" /> : <Simulations sims={s} track={track} onOpen={(id) => setParam('sim', id)} />}
        </div>
      </section>
    </div>
  );
}
