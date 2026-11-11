// A round of multiple-choice questions: answer, read why, and finish with a score.
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { ArrowLeft, ArrowRight, Check, RotateCcw, Trophy, X } from 'lucide-react';
import { useAnswer, type AnswerResult, type Question } from '../../api/interview';
import { DifficultyPill } from './bits';
import { tagLabel } from './text';

const LETTERS = ['A', 'B', 'C', 'D'];

export function Quiz({ questions, onDone }: { questions: Question[]; onDone: () => void }) {
  const answer = useAnswer();
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [score, setScore] = useState(0);
  const finished = i >= questions.length;
  const q = questions[i];

  const choose = (c: number) => {
    if (picked !== null || !q) return;
    setPicked(c);
    answer.mutate(
      { id: q.id, choice: c },
      {
        onSuccess: (r) => {
          setResult(r);
          if (r.correct) setScore((s) => s + 1);
        },
      },
    );
  };
  const next = () => {
    setI((n) => n + 1);
    setPicked(null);
    setResult(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      const n = 'abcd'.indexOf(e.key.toLowerCase());
      if (n >= 0 && picked === null) choose(n);
      if ((e.key === 'Enter' || e.key === 'ArrowRight') && result) next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="modal-enter flex flex-col items-center gap-3 rounded-card border border-border bg-surface px-6 py-14 text-center">
        <span className="rounded-full bg-accent/10 p-4 text-accent">
          <Trophy className="size-7" />
        </span>
        <div className="font-mono text-4xl font-semibold tabular-nums text-text">
          {score}/{questions.length}
        </div>
        <p className="text-sm text-muted">
          {pct >= 80 ? 'Sharp. You are interview ready on these.' : pct >= 50 ? 'Solid. Review the misses and go again.' : 'Good practice. The explanations are where the learning is.'}
        </p>
        <button onClick={onDone} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg hover:bg-accent/85">
          <RotateCcw className="size-4" /> Back to practice
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-xs text-muted">
        <button onClick={onDone} className="inline-flex items-center gap-1 hover:text-text"><ArrowLeft className="size-3.5" /> Practice</button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${(i / questions.length) * 100}%` }} />
        </div>
        <span className="tabular-nums">{i + 1} / {questions.length}</span>
      </div>
      <div key={q.id} className="anim-rise rounded-card border border-border bg-surface p-6">
        <div className="mb-3 flex flex-wrap gap-1.5 text-[11px]">
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">{q.domain}</span>
          <DifficultyPill d={q.difficulty} />
          {q.tags?.map((t) => <span key={t} className="rounded-full border border-border px-2 py-0.5 text-faint">{tagLabel(t)}</span>)}
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
          {i + 1 === questions.length ? 'Finish' : 'Next'} <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
