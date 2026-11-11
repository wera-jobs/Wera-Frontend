// Interview prep, by role. A track (Backend, Frontend, Data, ...) picks
// what to practice: work simulations told as emails, where each reply is
// rated and explained like a situational round's debrief, and rounds of
// questions from the domains that role's loop weighs, leaning toward the
// stack the user picks. Jobs the user is interviewing for sit on top with
// the topics Wera expects, a click from practicing for them.
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  ArrowRight, Brain, CalendarCheck, Flame, GraduationCap, History, Lightbulb, LoaderCircle, Mail, MessagesSquare, Sparkles, Target,
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

function TrackBar({ tracks, value, suggested, onChange }: { tracks: Track[]; value: string; suggested: string; onChange: (id: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Role" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
      {tracks.map((t) => {
        const on = t.id === value;
        return (
          <button key={t.id} role="radio" aria-checked={on} onClick={() => onChange(t.id)}
            className={clsx('inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors duration-200',
              on ? 'border-accent/50 bg-accent/10 font-medium text-accent' : 'border-border bg-surface text-muted hover:border-accent/30 hover:text-text')}>
            {t.label}
            {t.id === suggested && <span className={clsx('rounded-full px-1.5 text-[10px] font-semibold', on ? 'bg-accent/15' : 'bg-surface-2 text-faint')}>For you</span>}
          </button>
        );
      })}
    </div>
  );
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-card border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-muted">{icon}{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-text">{value}</div>
      {hint && <div className="mt-0.5 truncate text-[11px] text-faint">{hint}</div>}
    </div>
  );
}

function PracticeStats({ practice, domains, sims, track }: { practice?: Practice; domains: DomainStat[]; sims: ScenarioCard[]; track: Track }) {
  const inTrack = domains.filter((d) => track.domains.includes(d.domain));
  const answered = inTrack.reduce((a, d) => a + d.answered, 0);
  const right = inTrack.reduce((a, d) => a + d.correct, 0);
  const mine = sims.filter((s) => track.scenarios.includes(s.id));
  const done = mine.filter((s) => s.progress.best >= 0).length;
  const streak = practice?.streak ?? 0;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat icon={<Flame className="size-3.5" />} label="Day streak" value={String(streak)}
        hint={streak ? 'Practice today to keep it' : 'Answer one question to start'} />
      <Stat icon={<CalendarCheck className="size-3.5" />} label="This week" value={String(practice?.week ?? 0)} hint="answers and replies" />
      <Stat icon={<Target className="size-3.5" />} label="Accuracy" value={answered ? `${Math.round((right / answered) * 100)}%` : '-'}
        hint={answered ? `${right} of ${answered} in this track` : 'No questions answered yet'} />
      <Stat icon={<Mail className="size-3.5" />} label="Simulations" value={`${done}/${mine.length}`} hint="finished in this track" />
    </div>
  );
}

function UpcomingJob({ id, title, company, onPractice }: { id: number; title: string; company: string; onPractice: (track: string) => void }) {
  const job = useJob(id);
  const topics = job.data?.deep?.raw.interview_topics ?? [];
  return (
    <li className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <Link to={`/jobs/${id}`} className="text-sm font-semibold text-text hover:text-accent">{title}</Link>
        <div className="text-xs text-muted">{company}</div>
        {topics.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {topics.slice(0, 3).map((t, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-snug text-muted">
                <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-accent" /><span className="line-clamp-2">{t}</span>
              </li>
            ))}
          </ul>
        ) : job.isLoading ? <Skeleton className="mt-2 h-8 w-3/4" /> : (
          <p className="mt-2 text-[13px] text-faint">Open the job for Wera&apos;s full review and the topics it expects.</p>
        )}
      </div>
      <button onClick={() => onPractice(trackForTitle(title))}
        className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text hover:border-accent/40 hover:text-accent">
        Practice for it <ArrowRight className="size-3.5" />
      </button>
    </li>
  );
}

function Upcoming({ onPractice }: { onPractice: (track: string) => void }) {
  const jobs = useJobs({ status: 'interviewing', limit: 3 });
  const list = jobs.data?.jobs ?? [];
  if (!list.length) return null;
  return (
    <section aria-labelledby="upcoming" className="space-y-3">
      <h2 id="upcoming" className="flex items-center gap-2 text-sm font-semibold text-text"><Sparkles className="size-4 text-accent" /> Your interviews</h2>
      <ul className="grid gap-3 lg:grid-cols-2">
        {list.map((j) => <UpcomingJob key={j.id} id={j.id} title={j.title} company={j.company} onPractice={onPractice} />)}
      </ul>
    </section>
  );
}

function SimCard({ s, onOpen, i }: { s: ScenarioCard; onOpen: () => void; i: number }) {
  const p = s.progress;
  const going = p.answered > 0 && p.answered < s.steps;
  return (
    <button onClick={onOpen} style={{ animationDelay: `${i * 40}ms` }}
      className="anim-rise group flex flex-col rounded-card border border-border bg-surface p-4 text-left transition-all duration-200 hover:-translate-y-px hover:border-accent/40">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-accent/10 p-1.5 text-accent"><Mail className="size-4" /></span>
        <span className="text-[11px] text-muted">{s.role}</span>
        <span className="ml-auto"><DifficultyPill d={s.difficulty} /></span>
      </div>
      <h3 className="mt-3 text-[15px] leading-snug font-semibold text-text">{s.title}</h3>
      <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-muted">{s.blurb}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {s.skills.map((k) => <span key={k} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted">{k}</span>)}
      </div>
      <div className="mt-auto flex items-center gap-2 pt-4">
        <span className="flex gap-1" title={s.cast.map((c) => `${c.name}, ${c.role}`).join('\n')}>
          {s.cast.slice(0, 4).map((c) => <PersonMark key={c.name} name={c.name} size="sm" />)}
        </span>
        <span className="text-[11px] text-faint">{s.steps} emails</span>
        <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-accent">
          {going ? `Continue ${p.answered}/${s.steps}` : p.best >= 0 ? `Best ${p.best}/${s.max_points} · Again` : 'Start'}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}

function Simulations({ sims, track, onOpen }: { sims: ScenarioCard[]; track: Track; onOpen: (id: string) => void }) {
  const mine = track.scenarios.map((id) => sims.find((s) => s.id === id)).filter((s): s is ScenarioCard => !!s);
  return (
    <section aria-labelledby="sims" className="space-y-3">
      <div>
        <h2 id="sims" className="text-sm font-semibold text-text">Work simulations</h2>
        <p className="mt-0.5 text-[13px] text-muted">
          A few days on the job, as emails. Pick a reply to each, then see how every option rates and why, like the situational rounds in big-tech loops.
        </p>
      </div>
      {mine.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((s, i) => <SimCard key={s.id} s={s} i={i} onOpen={() => onOpen(s.id)} />)}
        </div>
      ) : <p className="text-sm text-muted">No simulations for this role yet.</p>}
    </section>
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
  const all = { domain: '', kind: 'technical' as const, questions: list.reduce((a, d) => a + d.questions, 0), answered: list.reduce((a, d) => a + d.answered, 0), correct: list.reduce((a, d) => a + d.correct, 0) };
  const tags = track.stack.slice(0, 10);
  const toggle = (t: string) => setStack((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));
  const missed = practice?.missed ?? 0;
  return (
    <section aria-labelledby="rounds" className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <h2 id="rounds" className="text-sm font-semibold text-text">Question rounds</h2>
          <p className="mt-0.5 text-[13px] text-muted">Ten quick questions on what this loop covers, new ones first. Pick your stack to see those questions first.</p>
        </div>
        {missed > 0 && (
          <button onClick={() => onStart({ domain: '', difficulty: '', stack: [], missed: true })} disabled={starting}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text hover:border-accent/40 hover:text-accent">
            <History className="size-3.5" /> Review {missed} missed
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[all, ...list].map((d, i) => {
          const on = domain === d.domain;
          const pct = d.questions ? Math.round((d.answered / d.questions) * 100) : 0;
          const Icon = !d.domain ? GraduationCap : d.kind === 'behavioral' ? MessagesSquare : d.kind === 'product' ? Lightbulb : Brain;
          return (
            <button key={d.domain || 'all'} onClick={() => setDomain(d.domain)} aria-pressed={on} style={{ animationDelay: `${i * 35}ms` }}
              className={clsx('anim-rise rounded-card border bg-surface p-4 text-left transition-all duration-200 hover:-translate-y-px',
                on ? 'border-accent/50 ring-2 ring-accent/15' : 'border-border hover:border-accent/30')}>
              <div className="flex items-center gap-2">
                <span className={clsx('rounded-lg p-1.5', on ? 'bg-accent/15 text-accent' : 'bg-surface-2 text-muted')}><Icon className="size-4" /></span>
                <span className="text-sm font-semibold text-text">{d.domain || 'All topics'}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] text-faint tabular-nums">
                <span>{d.answered}/{d.questions} answered</span>
                {d.answered > 0 && <span>{Math.round((d.correct / d.answered) * 100)}% right</span>}
              </div>
            </button>
          );
        })}
      </div>
      <div className="space-y-3 rounded-card border border-border bg-surface p-4">
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-sm text-muted">Your stack</span>
            {tags.map((t) => {
              const on = stack.includes(t.tag);
              return (
                <button key={t.tag} onClick={() => toggle(t.tag)} aria-pressed={on}
                  className={clsx('rounded-full border px-2.5 py-1 text-xs transition-colors',
                    on ? 'border-accent/50 bg-accent/10 font-medium text-accent' : 'border-border text-muted hover:text-text')}>
                  {tagLabel(t.tag)}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted">Difficulty</span>
          <div role="radiogroup" aria-label="Difficulty" className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
            {DIFFS.map((d) => (
              <button key={d.label} role="radio" aria-checked={diff === d.value} onClick={() => setDiff(d.value)}
                className={clsx('rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200',
                  diff === d.value ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text')}>
                {d.label}
              </button>
            ))}
          </div>
          <button onClick={() => onStart({ domain, difficulty: diff, stack })} disabled={starting}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg hover:bg-accent/85 disabled:opacity-60">
            {starting ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />} Start 10 questions
          </button>
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

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(sp);
    if (v) next.set(k, v);
    else next.delete(k);
    setSp(next, { replace: k === 'track' });
  };
  const pickTrack = (id: string) => {
    rememberTrack(id);
    setParam('track', id);
  };

  const header = (
    <header className="mb-6">
      <h1 className="text-[28px] leading-tight font-semibold">Interview prep</h1>
      <p className="mt-1 text-sm text-muted">Practice for the loop your role gets: work simulations told as emails, and quick question rounds for your stack.</p>
    </header>
  );

  if (sim) {
    return (
      <div className="mx-auto max-w-3xl pb-10">
        <ScenarioPlayer key={sim} id={sim} onDone={() => setParam('sim', null)} />
      </div>
    );
  }
  if (quiz?.length) {
    return (
      <div className="mx-auto max-w-2xl pb-10">
        <Quiz key={quiz[0].id} questions={quiz} onDone={() => setQuiz(null)} />
      </div>
    );
  }
  if (tracks.isLoading || domains.isLoading) {
    return <div className="mx-auto max-w-5xl pb-10">{header}<Skeleton className="h-96 w-full" /></div>;
  }
  const failed = tracks.isLoadingError ? tracks : domains.isLoadingError ? domains : null;
  if (failed) {
    return <div className="mx-auto max-w-5xl pb-10">{header}<ErrorState message={String(failed.error)} onRetry={() => void failed.refetch()} /></div>;
  }
  if (!track) return <div className="mx-auto max-w-5xl pb-10">{header}<EmptyState title="Practice is on its way" hint="Check back soon." /></div>;
  const d = domains.data?.domains ?? [];
  const s = sims.data?.scenarios ?? [];
  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10">
      <div>
        {header}
        <TrackBar tracks={list} value={trackId} suggested={suggested} onChange={pickTrack} />
        <p className="mt-2 text-[13px] text-muted">{track.blurb}</p>
      </div>
      <PracticeStats practice={domains.data?.practice} domains={d} sims={s} track={track} />
      <Upcoming onPractice={pickTrack} />
      {sims.isLoading ? <Skeleton className="h-56 w-full" /> : <Simulations sims={s} track={track} onOpen={(id) => setParam('sim', id)} />}
      <Rounds key={track.id} track={track} domains={d} practice={domains.data?.practice} starting={start.isPending}
        onStart={(v) => start.mutate({ ...v, track: track.id }, { onSuccess: (r) => setQuiz(r.questions) })} />
      {quiz && !quiz.length && <p className="text-sm text-muted">No questions match that choice yet. Try another difficulty or stack.</p>}
    </div>
  );
}
