import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowUp, LoaderCircle, MessageCircle, Trash2 } from 'lucide-react';
import {
  answerParts,
  askAssistant,
  SOURCE_LABELS,
  useAssistantThread,
  useAssistantThreads,
  useDeleteThread,
  type AssistantMessage,
  type AssistantSource,
} from '../api/assistant';
import { errorMessage } from '../api/client';
import { toast } from '../lib/toast';

/** One answer, with the data it names shown as small labels instead of brackets. */
export function AnswerText({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">
      {answerParts(text).map((p, i) =>
        'source' in p ? (
          <span key={i} title={`From your ${SOURCE_LABELS[p.source].toLowerCase()}`} className="ml-1 inline-block rounded bg-accent/10 px-1 align-[1px] text-[10px] font-medium text-accent">
            {SOURCE_LABELS[p.source]}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </p>
  );
}

function Sources({ sources }: { sources: AssistantSource[] }) {
  if (!sources.length) return <p className="mt-1.5 text-[11px] text-faint">General advice: not from your data.</p>;
  return <p className="mt-1.5 text-[11px] text-faint">Used: {sources.map((s) => SOURCE_LABELS[s]).join(', ')}</p>;
}

const JOB_STARTERS = ['Should I apply?', 'How do I position myself for this role?', 'What are my gaps for this job?', 'Rewrite this answer: '];
const GENERAL_STARTERS = ['Which of my applications should I follow up on?', 'What roles fit my profile best?', 'Draft a short summary of me for a recruiter'];

/**
 * Ask Wera: a conversation grounded on the user's own data. With jobId it
 * is about that job and picks up the latest conversation about it; with
 * threadId it shows that conversation. Answers stream in as they are
 * written.
 */
export function AssistantChat({
  jobId,
  threadId: initialThread = null,
  onThread,
  className,
}: {
  jobId?: number;
  threadId?: number | null;
  onThread?: (id: number | null) => void;
  className?: string;
}) {
  const qc = useQueryClient();
  const threads = useAssistantThreads(jobId);
  // A job's chat continues its latest conversation.
  const [threadId, setThreadId] = useState<number | null>(initialThread);
  const [picked, setPicked] = useState(initialThread != null);
  if (!picked && jobId && threads.data) {
    setPicked(true);
    setThreadId(threads.data.threads[0]?.id ?? null);
  }
  const [shownFor, setShownFor] = useState(initialThread);
  if (shownFor !== initialThread) {
    setShownFor(initialThread);
    setThreadId(initialThread);
  }
  const thread = useAssistantThread(threadId);
  const remove = useDeleteThread();
  const [text, setText] = useState('');
  const [pending, setPending] = useState<{ question: string; answer: string } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const messages: AssistantMessage[] = thread.data?.messages ?? [];
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'nearest' });
  }, [messages.length, pending?.answer]);

  const left = threads.data?.questions_left;
  const enabled = threads.data?.enabled !== false;

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || pending) return;
    setText('');
    setPending({ question: q, answer: '' });
    abort.current = new AbortController();
    let id = threadId;
    try {
      await askAssistant(
        { message: q, ...(id ? { thread_id: id } : jobId ? { job_id: jobId } : {}) },
        {
          onThread: (t) => {
            id = t.thread_id;
            if (t.thread_id !== threadId) {
              setThreadId(t.thread_id);
              onThread?.(t.thread_id);
            }
          },
          onDelta: (d) => setPending((p) => p && { ...p, answer: p.answer + d }),
        },
        abort.current.signal,
      );
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error(errorMessage(e));
    } finally {
      await Promise.all([
        id != null ? qc.invalidateQueries({ queryKey: ['assistant', 'thread', id] }) : null,
        qc.invalidateQueries({ queryKey: ['assistant', 'threads'] }),
      ]);
      setPending(null);
    }
  };

  const starters = jobId ? JOB_STARTERS : GENERAL_STARTERS;
  return (
    <div className={clsx('flex min-h-0 flex-col', className)}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-3">
        {messages.length === 0 && !pending && (
          <div className="rounded-card border border-dashed border-border px-5 py-8 text-center">
            <span className="mx-auto mb-2 flex size-9 items-center justify-center rounded-full bg-accent/10 text-accent">
              <MessageCircle className="size-4" />
            </span>
            <h3 className="text-sm font-semibold text-text">{jobId ? 'Ask about this job' : 'Ask Wera'}</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted">
              Answers come from your profile, resume, application details{jobId ? ', this posting, its fit review and H-1B data' : ' and tracker'}, and say
              which they used.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {starters.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={!enabled}
                  onClick={() => {
                    if (s.endsWith(': ')) {
                      setText(s);
                      input.current?.focus();
                    } else void ask(s);
                  }}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:border-accent/40 hover:text-text disabled:opacity-50"
                >
                  {s.replace(/: $/, '…')}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-accent/12 px-3.5 py-2 text-sm text-text">
              {m.content}
            </div>
          ) : (
            <div key={m.id} className="max-w-[95%]">
              <AnswerText text={m.content} />
              <Sources sources={m.sources} />
            </div>
          ),
        )}
        {pending && (
          <>
            <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-accent/12 px-3.5 py-2 text-sm text-text">{pending.question}</div>
            <div className="max-w-[95%]" aria-live="polite">
              {pending.answer ? (
                <AnswerText text={pending.answer} />
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                  <LoaderCircle className="size-3.5 animate-spin" /> Reading your data…
                </span>
              )}
            </div>
          </>
        )}
        <div ref={end} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(text);
        }}
        className="border-t border-border pt-3"
      >
        <div className="flex items-end gap-2 rounded-xl border border-border bg-surface px-3 py-2 focus-within:border-accent/50">
          <textarea
            ref={input}
            aria-label="Ask Wera"
            value={text}
            maxLength={2000}
            rows={1}
            disabled={!enabled}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void ask(text);
              }
            }}
            placeholder={enabled ? (jobId ? 'Ask about this job…' : 'Ask about your search…') : 'Ask Wera is not available on this server'}
            className="max-h-40 min-h-[1.5rem] flex-1 resize-none bg-transparent text-sm text-text outline-none placeholder:text-faint [field-sizing:content]"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!text.trim() || !!pending || !enabled}
            className="rounded-lg bg-accent p-1.5 text-bg hover:bg-accent/85 disabled:opacity-40"
          >
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-faint">
          <span>
            {left != null && threads.data?.daily_limit ? `${left} of ${threads.data.daily_limit} questions left today. ` : ''}Uses your AI budget.
          </span>
          {threadId != null && messages.length > 0 && (
            <button
              type="button"
              onClick={() =>
                remove.mutate(threadId, {
                  onSuccess: () => {
                    setThreadId(null);
                    onThread?.(null);
                  },
                  onError: (e) => toast.error(errorMessage(e)),
                })
              }
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap hover:text-bad"
            >
              <Trash2 className="size-3" /> Delete conversation
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
