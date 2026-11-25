// A round of multiple-choice questions: answer, read why, and finish with a score.
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Check, Clock, RotateCcw, Trophy, X } from 'lucide-react';
import { useAnswer, type AnswerResult, type Question } from '../../api/interview';
import { DifficultyPill } from './bits';
import { practiceKey, tagLabel } from './text';

const LETTERS = ['A', 'B', 'C', 'D'];
const BOOKMARK_KEY = 'wera.interview.bookmarks';
const SECONDS_PER_Q = 60;

function readBookmarks(): Set<number> {
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? new Set(arr.filter((x): x is number => typeof x === 'number')) : new Set();
  } catch {
    return new Set();
  }
}

function writeBookmarks(set: Set<number>) {
  try {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify([...set]));
  } catch {
    // Private window.
  }
}

/** A question answered wrong in this round, kept for the review at the end. */
interface Miss {
  q: Question;
  picked: number;
  result: AnswerResult;
}

export function Quiz({ questions: initialQuestions, onDone }: { questions: Question[]; onDone: () => void }) {
  const answer = useAnswer();
  const [deck, setDeck] = useState<Question[]>(initialQuestions);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState<Miss[]>([]);
  const [failed, setFailed] = useState(false);
  const [timed, setTimed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(SECONDS_PER_Q);
  const [bookmarks, setBookmarks] = useState<Set<number>>(() => readBookmarks());
  const finished = i >= deck.length;
  const q = deck[i];

  useEffect(() => {
    if (!timed || finished || result) return;
    const t = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(t);
  }, [timed, finished, result, i]);

  const toggleBookmark = (id: number) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeBookmarks(next);
      return next;
    });
  };

  const choose = (c: number) => {
    if (picked !== null || !q || c >= q.choices.length) return;
    setPicked(c);
    setFailed(false);
    answer.mutate(
      { id: q.id, choice: c },
      {
        onSuccess: (r) => {
          setResult(r);
          if (r.correct) setScore((s) => s + 1);
          else setMisses((m) => [...m, { q, picked: c, result: r }]);
        },
        // Not saved: the question opens again, or the round would be stuck on it.
        onError: () => {
          setPicked(null);
          setFailed(true);
        },
      },
    );
  };
  const next = () => {
    setI((n) => n + 1);
    setPicked(null);
    setResult(null);
    setFailed(false);
    setSecondsLeft(SECONDS_PER_Q);
  };

  const retryMissed = () => {
    setDeck(misses.map((m) => m.q));
    setI(0);
    setPicked(null);
    setResult(null);
    setScore(0);
    setMisses([]);
    setFailed(false);
    setSecondsLeft(SECONDS_PER_Q);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished) return;
      const k = practiceKey(e);
      if (typeof k === 'number' && picked === null) choose(k);
      if (k === 'next' && result) next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (finished) {
    const pct = Math.round((score / deck.length) * 100);
    return (
      <div className="modal-enter space-y-5">
        <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface px-6 py-10 text-center">
          <span className="rounded-full bg-accent/10 p-4 text-accent">
            <Trophy className="size-7" />
          </span>
          <div className="font-mono text-4xl font-semibold tabular-nums text-text">
            {score}/{deck.length}
          </div>
          <p className="text-sm text-muted">
            {pct >= 80 ? 'Sharp. You are interview ready on these.' : pct >= 50 ? 'Solid. Read the ones you missed below, then go again.' : 'Good practice. The explanations below are where the learning is.'}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {misses.length > 0 && (
              <button onClick={retryMissed} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg hover:bg-accent/85">
                <RotateCcw className="size-4" /> Retry {misses.length} missed now
              </button>
            )}
            <button onClick={onDone} className={clsx('inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold', misses.length > 0 ? 'border border-border bg-surface-2 text-text hover:border-accent/40' : 'bg-accent text-bg hover:bg-accent/85')}>
              <RotateCcw className="size-4" /> Back to practice
            </button>
          </div>
        </div>
        {misses.length > 0 && (
          <section aria-labelledby="missed" className="rounded-card border border-border bg-surface">
            <h3 id="missed" className="border-b border-border px-5 py-3 text-sm font-semibold">What you missed ({misses.length})</h3>
            <ol className="divide-y divide-border">
              {misses.map(({ q: m, picked: p, result: r }) => (
                <li key={m.id} className="space-y-1.5 px-5 py-4">
                  <p className="text-sm font-medium text-text">{m.question}</p>
                  <p className="flex gap-2 text-[13px] text-muted"><X className="mt-0.5 size-3.5 shrink-0 text-bad" /><span><span className="sr-only">You answered: </span>{m.choices[p]}</span></p>
                  <p className="flex gap-2 text-[13px] text-text"><Check className="mt-0.5 size-3.5 shrink-0 text-good" /><span><span className="sr-only">The answer: </span>{m.choices[r.answer]}</span></p>
                  <p className="text-[13px] leading-relaxed text-muted">{r.explanation}</p>
                </li>
              ))}
            </ol>
            <p className="border-t border-border px-5 py-3 text-xs text-faint">These come back under Review missed on the practice page until you get them right.</p>
          </section>
        )}
      </div>
    );
  }

  const saved = bookmarks.has(q.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-xs text-muted">
        <button onClick={onDone} className="inline-flex items-center gap-1 hover:text-text"><ArrowLeft className="size-3.5" /> Practice</button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${(i / deck.length) * 100}%` }} />
        </div>
        <button
          type="button"
          aria-pressed={timed}
          onClick={() => {
            setTimed((t) => !t);
            setSecondsLeft(SECONDS_PER_Q);
          }}
          className={clsx(
            'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] transition-colors',
            timed ? (secondsLeft <= 10 ? 'border-bad/40 bg-bad/10 text-bad' : 'border-accent/40 bg-accent/10 text-accent') : 'border-border text-faint hover:text-text',
          )}
          title="Toggle 60-second per-question pacing timer"
        >
          <Clock className="size-3" /> {timed ? `${secondsLeft}s` : 'Timer'}
        </button>
        <span className="tabular-nums">{i + 1} / {deck.length}</span>
      </div>
      <div key={q.id} className="anim-rise rounded-card border border-border bg-surface p-6">
        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">{q.domain}</span>
          <DifficultyPill d={q.difficulty} />
          {q.tags?.map((t) => <span key={t} className="rounded-full border border-border px-2 py-0.5 text-faint">{tagLabel(t)}</span>)}
          <button
            type="button"
            aria-pressed={saved}
            aria-label={saved ? 'Remove bookmark' : 'Bookmark question'}
            onClick={() => toggleBookmark(q.id)}
            className={clsx('ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] transition-colors', saved ? 'text-accent' : 'text-faint hover:text-text')}
          >
            {saved ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />}
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
        <h2 className="text-lg leading-snug font-semibold text-text">{q.question}</h2>
        <div className="mt-5 grid gap-2">
          {q.choices.map((c, n) => {
            const isAnswer = result?.answer === n;
            const wrongPick = result && picked === n && !result.correct;
            return (
              <button
                key={n}
                onClick={() => choose(n)}
                disabled={picked !== null}
                className={clsx(
                  'flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all duration-200',
                  !result && picked === null && 'border-border hover:border-accent/40 hover:bg-surface-2/60',
                  !result && picked === n && 'border-accent/50 bg-accent/5',
                  isAnswer && 'border-good/50 bg-good/10',
                  wrongPick && 'border-bad/50 bg-bad/10',
                  result && !isAnswer && !wrongPick && 'border-border opacity-60',
                )}
              >
                <span
                  className={clsx(
                    'flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-semibold',
                    isAnswer ? 'bg-good text-white' : wrongPick ? 'bg-bad text-white' : 'bg-surface-2 text-muted',
                  )}
                >
                  {isAnswer ? <Check className="size-3.5" /> : wrongPick ? <X className="size-3.5" /> : LETTERS[n]}
                </span>
                <span className="pt-0.5 text-text">{c}</span>
              </button>
            );
          })}
        </div>
        {failed && <p role="alert" className="mt-4 text-sm text-bad">Could not save your answer. Check your connection and pick again.</p>}
        {result && (
          <div className="fade-enter mt-5 rounded-lg border border-border bg-surface-2/50 p-4">
            <div className={clsx('text-sm font-semibold', result.correct ? 'text-good' : 'text-bad')}>
              {result.correct ? 'Correct' : `Not quite. The answer is ${LETTERS[result.answer]}.`}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted">{result.explanation}</p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-faint">Keys: A to D to answer, Enter for next</span>
        <button
          onClick={next}
          disabled={!result}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg hover:bg-accent/85 disabled:opacity-40"
        >
          {i + 1 === deck.length ? 'Finish' : 'Next'} <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
