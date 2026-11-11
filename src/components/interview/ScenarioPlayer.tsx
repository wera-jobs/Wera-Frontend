// A work simulation: a few days at Wera told as emails. Each email asks for
// a reply out of four. Once one is picked, every reply shows how it rates
// and why, then a takeaway, as the debrief of a situational round would.
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { ArrowLeft, ArrowRight, Lightbulb, LoaderCircle, Mail, RotateCcw } from 'lucide-react';
import { useAnswerStep, useScenario, type Person, type ScenarioDetail, type StepReveal } from '../../api/interview';
import { ErrorState, Skeleton } from '../States';
import { DifficultyPill } from './bits';
import { RATING, verdict } from './text';

const LETTERS = ['A', 'B', 'C', 'D'];

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

const TONES = ['bg-accent/15 text-accent', 'bg-accent-2/15 text-accent-2', 'bg-good/15 text-good', 'bg-warn/15 text-warn'];

export function PersonMark({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const tone = TONES[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % TONES.length];
  return (
    <span aria-hidden className={clsx('grid shrink-0 place-items-center rounded-full font-semibold', tone, size === 'sm' ? 'size-6 text-[10px]' : 'size-9 text-xs')}>
      {name === 'Wera alerts' ? <Mail className="size-4" /> : initials(name)}
    </span>
  );
}

function roleOf(cast: Person[], name: string) {
  return cast.find((p) => p.name === name)?.role ?? (/alert/i.test(name) ? 'Automated alert' : '');
}

export function ScenarioPlayer({ id, onDone }: { id: string; onDone: () => void }) {
  const q = useScenario(id);
  if (q.isLoading) return <Skeleton className="h-[520px] w-full" />;
  if (q.isError || !q.data) return <ErrorState message={String(q.error ?? 'Not found')} onRetry={() => void q.refetch()} />;
  return <Run id={id} data={q.data} onDone={onDone} />;
}

/** Where a run stands when the simulation opens: the last run, unless it finished. */
function resume(data: ScenarioDetail): { reveals: Record<number, StepReveal>; cur: number } {
  const n = data.steps.length;
  const reveals: Record<number, StepReveal> = {};
  if (data.answered.length < n) for (const r of data.answered) reveals[r.step] = r;
  const cur = Array.from({ length: n }, (_, i) => i).find((i) => !reveals[i]) ?? 0;
  return { reveals, cur };
}

function Run({ id, data, onDone }: { id: string; data: ScenarioDetail; onDone: () => void }) {
  const answer = useAnswerStep(id);
  const [start] = useState(() => resume(data));
  const [reveals, setReveals] = useState<Record<number, StepReveal>>(start.reveals);
  const [cur, setCur] = useState(start.cur);
  const [finished, setFinished] = useState(false);

  const step = data.steps[cur];
  const shown = reveals[cur];
  const total = data.steps.length;
  const points = useMemo(() => Object.values(reveals).reduce((a, r) => a + r.points, 0), [reveals]);

  const choose = (c: number) => {
    if (!step || shown || answer.isPending) return;
    answer.mutate({ step: cur, choice: c }, { onSuccess: (r) => setReveals((m) => ({ ...m, [cur]: r })) });
  };
  const next = () => {
    if (!shown) return;
    if (cur + 1 >= total) setFinished(true);
    else setCur(cur + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const again = () => {
    setReveals({});
    setCur(0);
    setFinished(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      const n = 'abcd'.indexOf(e.key.toLowerCase());
      if (n >= 0 && !shown) choose(n);
      if ((e.key === 'Enter' || e.key === 'ArrowRight') && shown) next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const sc = data.scenario;

  if (finished) {
    const max = sc.max_points;
    return (
      <div className="modal-enter space-y-5">
        <button onClick={onDone} className="inline-flex items-center gap-1 text-xs text-muted hover:text-text"><ArrowLeft className="size-3.5" /> Practice</button>
        <div className="rounded-card border border-border bg-surface p-6 text-center">
          <p className="text-xs font-medium tracking-wide text-faint uppercase">{sc.title}</p>
          <div className="mt-2 font-mono text-4xl font-semibold tabular-nums text-text">{points}/{max}</div>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">{verdict(points, max)}</p>
        </div>
        <div className="rounded-card border border-border bg-surface">
          <h3 className="border-b border-border px-5 py-3 text-sm font-semibold">Your debrief</h3>
          <ol className="divide-y divide-border">
            {data.steps.map((st, i) => {
              const r = reveals[i];
              const R = r ? RATING[r.rating] : null;
              return (
                <li key={i} className="flex gap-3 px-5 py-3.5">
                  {R ? <R.Icon className={clsx('mt-0.5 size-4 shrink-0', R.cls.split(' ')[0])} /> : <span className="size-4" />}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                      <span className="font-medium text-text">{st.skill}</span>
                      <span className="truncate text-xs text-faint">{st.email.subject}</span>
                    </div>
                    {r && <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{r.takeaway}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={again} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-2">
            <RotateCcw className="size-4" /> Run it again
          </button>
          <button onClick={onDone} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg hover:bg-accent/85">
            Back to practice <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!step) return null;
  const e = step.email;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button onClick={onDone} className="inline-flex items-center gap-1 text-xs text-muted hover:text-text"><ArrowLeft className="size-3.5" /> Practice</button>
        <span className="text-xs text-faint">·</span>
        <span className="text-xs font-medium text-text">{sc.title}</span>
        <DifficultyPill d={sc.difficulty} />
        <span className="ml-auto text-xs text-muted tabular-nums">Email {cur + 1} of {total}</span>
      </div>
      <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }} aria-label="Progress">
        {data.steps.map((st, i) => {
          const r = reveals[i];
          return (
            <li key={i} title={st.skill} aria-current={i === cur ? 'step' : undefined}>
              <div className={clsx('h-1.5 rounded-full transition-colors duration-300',
                r ? (r.rating === 'best' ? 'bg-good' : r.rating === 'okay' ? 'bg-warn' : 'bg-bad') : i === cur ? 'bg-accent' : 'bg-surface-2')} />
              <span className={clsx('mt-1 hidden truncate text-[11px] sm:block', i === cur ? 'text-text' : 'text-faint')}>{st.skill}</span>
            </li>
          );
        })}
      </ol>

      {cur === 0 && !shown && (
        <div className="anim-rise rounded-card border border-border bg-surface-2/40 p-4">
          <p className="text-sm text-text">{sc.blurb}</p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2" aria-label="Who's who">
            {sc.cast.map((p) => (
              <li key={p.name} className="flex items-center gap-2 text-xs">
                <PersonMark name={p.name} size="sm" />
                <span><span className="font-medium text-text">{p.name}</span> <span className="text-muted">{p.role}</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <article key={cur} className="anim-rise overflow-hidden rounded-card border border-border bg-surface" aria-label={`Email: ${e.subject}`}>
        <header className="border-b border-border px-5 py-4">
          <h2 className="text-[17px] leading-snug font-semibold text-text">{e.subject}</h2>
          <div className="mt-3 flex items-start gap-3">
            <PersonMark name={e.from} />
            <div className="min-w-0 flex-1 text-sm">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium text-text">{e.from}</span>
                <span className="text-xs text-muted">{roleOf(sc.cast, e.from)}</span>
              </div>
              <div className="mt-0.5 text-xs text-faint">
                To: {e.to}{e.cc?.length ? ` · Cc: ${e.cc.join(', ')}` : ''}
              </div>
            </div>
            <time className="shrink-0 text-xs text-faint">{e.when}</time>
          </div>
        </header>
        <div className="px-5 py-4 text-sm leading-relaxed whitespace-pre-line text-text">{e.body}</div>
      </article>

      <section aria-label="Your reply" className="rounded-card border border-border bg-surface p-5">
        <h3 className="text-sm font-semibold text-text">{step.prompt}</h3>
        <div className="mt-4 grid gap-2">
          {step.choices.map((c, n) => {
            const rv = shown?.choices[n];
            const R = rv ? RATING[rv.rating] : null;
            const mine = shown?.choice === n;
            return (
              <button key={n} onClick={() => choose(n)} disabled={!!shown || answer.isPending}
                aria-label={`${LETTERS[n]}: ${c}`}
                className={clsx('rounded-lg border px-4 py-3 text-left text-sm transition-all duration-200',
                  !shown && 'border-border hover:border-accent/40 hover:bg-surface-2/60',
                  !shown && answer.isPending && answer.variables?.choice === n && 'border-accent/50 bg-accent/5',
                  shown && R && (mine || rv.rating === 'best') && R.ring,
                  shown && !mine && rv?.rating !== 'best' && 'border-border',
                  mine && 'ring-2 ring-accent/20')}>
                <span className="flex items-start gap-3">
                  <span className={clsx('flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-semibold',
                    R ? R.cls : 'bg-surface-2 text-muted')}>
                    {R ? <R.Icon className="size-3.5" /> : LETTERS[n]}
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <span className="text-text">{c}</span>
                    {rv && R && (
                      <span className="fade-enter mt-2 block text-[13px] leading-relaxed text-muted">
                        <span className={clsx('mr-1.5 inline-block rounded px-1.5 py-px text-[11px] font-semibold', R.cls)}>{R.label}{mine ? ' · your pick' : ''}</span>
                        {rv.feedback}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {answer.isError && <p className="mt-3 text-sm text-bad">Could not save your reply. Try again.</p>}
        {shown && (
          <div className="fade-enter mt-5 flex gap-3 rounded-lg border border-accent/20 bg-accent/5 p-4">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" />
            <div>
              <div className="text-xs font-semibold tracking-wide text-accent uppercase">What this tests: {step.skill}</div>
              <p className="mt-1 text-sm leading-relaxed text-text">{shown.takeaway}</p>
            </div>
          </div>
        )}
      </section>

      <div className="flex items-center justify-between">
        <span className="hidden text-[11px] text-faint sm:inline">Keys: A to D to reply, Enter for the next email</span>
        <button onClick={next} disabled={!shown}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg hover:bg-accent/85 disabled:opacity-40">
          {answer.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {cur + 1 === total ? 'See your debrief' : 'Next email'} <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
