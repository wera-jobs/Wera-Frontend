import { useState } from 'react';
import clsx from 'clsx';
import { CheckCircle2, Copy, Eye, EyeOff, GraduationCap, LoaderCircle, MessageSquareText, RefreshCw, Sparkles } from 'lucide-react';
import { errorMessage } from '../api/client';
import { ErrorState } from './States';
import { useInterviewPrep, usePracticeAnswer, useWriteInterviewPrep } from '../api/hooks';
import type { JobDetail, PracticeFeedback, PrepQuestion } from '../api/types';
import { copyText } from '../lib/clipboard';
import { relTime } from '../lib/format';
import { toast } from '../lib/toast';

const KIND: Record<PrepQuestion['kind'], string> = {
  role: 'The role',
  behavioral: 'Behavioral',
  motivation: 'Motivation',
  company: 'The company',
};

const FILTER_KINDS: (PrepQuestion['kind'] | 'all')[] = ['all', 'role', 'behavioral', 'motivation', 'company'];

function draftKey(jobId: number, question: string) {
  return `wera.prep.draft.${jobId}.${question.slice(0, 64)}`;
}

function readDraft(jobId: number, question: string): string {
  try {
    return localStorage.getItem(draftKey(jobId, question)) ?? '';
  } catch {
    return '';
  }
}

function saveDraft(jobId: number, question: string, text: string) {
  try {
    if (text.trim()) localStorage.setItem(draftKey(jobId, question), text);
    else localStorage.removeItem(draftKey(jobId, question));
  } catch {
    // Private browsing.
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      {children}
    </section>
  );
}

function Feedback({ f }: { f: PracticeFeedback }) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-2/50 p-3 text-xs leading-relaxed">
      {f.strengths.length > 0 && (
        <div>
          <div className="mb-1 font-semibold text-good">What works</div>
          <ul className="list-disc space-y-1 pl-4 text-text">
            {f.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {f.improve.length > 0 && (
        <div>
          <div className="mb-1 font-semibold text-warn">To improve</div>
          <ul className="list-disc space-y-1 pl-4 text-text">
            {f.improve.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {f.outline.length > 0 && (
        <div>
          <div className="mb-1 font-semibold text-text">A stronger answer</div>
          <ol className="list-decimal space-y-1 pl-4 text-muted">
            {f.outline.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/** One likely question: why it comes up, the user's own talking points (or what to prepare), and a practice box. */
function Question({
  jobId,
  q,
  n,
  studyMode,
  onPracticed,
}: {
  jobId: number;
  q: PrepQuestion;
  n: number;
  studyMode: boolean;
  onPracticed: () => void;
}) {
  const [answer, setAnswer] = useState(() => readDraft(jobId, q.question));
  const [open, setOpen] = useState(() => answer.trim().length > 0);
  const [revealed, setRevealed] = useState(false);
  const practice = usePracticeAnswer(jobId);
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  const spokenSec = Math.round((words / 130) * 60);
  const hideNotes = studyMode && !revealed;

  const onChange = (val: string) => {
    setAnswer(val);
    saveDraft(jobId, q.question, val);
  };

  return (
    <li className="space-y-2 rounded-card border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 font-mono text-xs text-faint">{n}</span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-sm font-medium text-text">{q.question}</p>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted">{KIND[q.kind] ?? q.kind}</span>
            {practice.data && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-good">
                <CheckCircle2 className="size-3" /> Practiced
              </span>
            )}
          </div>
          {q.why && <p className="text-xs text-faint">{q.why}</p>}
          {hideNotes ? (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] font-medium text-muted hover:text-text"
            >
              <Eye className="size-3" /> Reveal talking points
            </button>
          ) : (
            <>
              {q.points.length > 0 && (
                <div>
                  <div className="mb-1 text-[11px] font-semibold text-good">Your talking points</div>
                  <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-text">
                    {q.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {q.prepare && (
                <p className="rounded-lg border border-warn/20 bg-warn/5 px-2.5 py-2 text-xs leading-relaxed text-text">
                  <span className="font-semibold text-warn">To prepare: </span>
                  {q.prepare}
                </p>
              )}
            </>
          )}
          {!open ? (
            <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline">
              <MessageSquareText className="size-3.5" /> Practice this answer
            </button>
          ) : (
            <div className="space-y-2 pt-1">
              <textarea
                value={answer}
                onChange={(e) => onChange(e.target.value)}
                rows={4}
                maxLength={4000}
                aria-label={`Your answer to: ${q.question}`}
                placeholder="Answer as you would out loud. A few sentences is enough."
                className="w-full resize-y rounded-lg border border-border bg-surface-2/50 px-3 py-2 text-xs leading-relaxed text-text placeholder:text-faint focus:border-accent/60"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={words < 10 || practice.isPending}
                  onClick={() =>
                    practice.mutate(
                      { question: q.question, answer },
                      {
                        onSuccess: () => onPracticed(),
                        onError: (e) => toast.error(errorMessage(e)),
                      },
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg hover:bg-accent/85 disabled:opacity-50"
                >
                  {practice.isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                  {practice.isPending ? 'Reading your answer…' : 'Get feedback'}
                </button>
                {words < 10 ? (
                  <span className="text-[11px] text-faint">At least 10 words.</span>
                ) : (
                  <span className="font-mono text-[11px] text-faint">{words} words · ~{spokenSec}s spoken</span>
                )}
              </div>
              {practice.data && <Feedback f={practice.data} />}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/** Interview prep for a job: the role, an intro, likely questions with study mode, practice, and questions to ask. */
export function InterviewPrepPanel({ job }: { job: JobDetail }) {
  const prep = useInterviewPrep(job.id);
  const write = useWriteInterviewPrep(job.id);
  const [kindFilter, setKindFilter] = useState<PrepQuestion['kind'] | 'all'>('all');
  const [studyMode, setStudyMode] = useState(false);
  const [practicedSet, setPracticedSet] = useState<Set<string>>(() => new Set());
  const generate = () => write.mutate(undefined, { onError: (e) => toast.error(errorMessage(e)) });

  if (prep.isLoading) return <div className="skeleton h-96 w-full" />;
  // A failed read is not "no prep": preparing again would replace it and spend AI.
  if (prep.isError && !prep.data) return <ErrorState message={errorMessage(prep.error)} onRetry={() => void prep.refetch()} />;
  if (!prep.data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-border px-6 py-16 text-center">
        <span className="rounded-full bg-accent/10 p-3 text-accent">
          <GraduationCap className="size-5" />
        </span>
        <h3 className="text-base font-semibold text-text">Get ready for {job.company}</h3>
        <p className="max-w-sm text-xs leading-relaxed text-muted">
          Wera reads this posting and your profile, then writes the questions you are likely to get, with talking points from your own
          experience, a 60-second intro and good questions to ask. Then practice your answers and get feedback.
        </p>
        <button
          type="button"
          onClick={generate}
          disabled={write.isPending}
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg hover:bg-accent/85 disabled:opacity-60"
        >
          {write.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {write.isPending ? 'Reading the posting and your profile…' : 'Prepare for this interview'}
        </button>
        <span className="text-[11px] text-faint">Takes about 20 seconds.</span>
      </div>
    );
  }

  const p = prep.data.prep;
  const visibleQuestions = kindFilter === 'all' ? p.questions : p.questions.filter((q) => q.kind === kindFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-faint">Prepared {relTime(prep.data.updated_at)}</span>
        {practicedSet.size > 0 && (
          <span className="rounded-full bg-good/10 px-2 py-0.5 font-mono text-[11px] font-medium text-good">
            {practicedSet.size}/{p.questions.length} practiced
          </span>
        )}
        <button
          type="button"
          onClick={generate}
          disabled={write.isPending}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text hover:border-accent/40 disabled:opacity-60"
        >
          {write.isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          {write.isPending ? 'Preparing…' : 'Prepare again'}
        </button>
      </div>

      <Section title="The role">
        <p className="text-sm leading-relaxed text-text">{p.role}</p>
        {p.they_value.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="What they value">
            {p.they_value.map((v) => (
              <li key={v} className="rounded-full border border-border px-2.5 py-1 text-xs text-text">
                {v}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {p.intro && (
        <Section title="Your 60-second intro">
          <p className="rounded-card border border-border bg-surface p-4 text-sm leading-relaxed text-text">{p.intro}</p>
          <button
            type="button"
            onClick={() => void copyText(p.intro).then((ok) => (ok ? toast.success('Copied.') : toast.error("Couldn't copy.")))}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-text"
          >
            <Copy className="size-3.5" /> Copy
          </button>
        </Section>
      )}

      <Section title="Likely questions">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filter questions">
            {FILTER_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kindFilter === k}
                onClick={() => setKindFilter(k)}
                className={clsx(
                  'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                  kindFilter === k ? 'border-accent/50 bg-accent/10 text-accent' : 'border-border text-muted hover:text-text',
                )}
              >
                {k === 'all' ? 'All' : KIND[k]}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-pressed={studyMode}
            onClick={() => setStudyMode((v) => !v)}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors',
              studyMode ? 'border-accent/50 bg-accent/10 text-accent' : 'border-border bg-surface-2 text-muted hover:text-text',
            )}
          >
            {studyMode ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {studyMode ? 'Study mode on' : 'Hide talking points'}
          </button>
        </div>
        <ol className="space-y-2.5">
          {visibleQuestions.map((q, i) => (
            <Question
              key={q.question}
              jobId={job.id}
              q={q}
              n={i + 1}
              studyMode={studyMode}
              onPracticed={() => setPracticedSet((prev) => new Set(prev).add(q.question))}
            />
          ))}
        </ol>
      </Section>

      {p.ask.length > 0 && (
        <Section title="Questions to ask them">
          <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-text">
            {p.ask.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ol>
        </Section>
      )}

      <p className="text-[11px] leading-relaxed text-faint">
        Built only from this posting and your own profile and resume. Check that every point is true for you before you say it.
      </p>
    </div>
  );
}
