import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Layers, LoaderCircle, Pencil, Search, Trash2 } from 'lucide-react';
import { errorMessage } from '../api/client';
import { useForgetAnswer, useSavedAnswers, useUpdateAnswer, type SavedAnswer } from '../api/extension';
import { relTime } from '../lib/format';
import { INPUT_CLS } from '../lib/styles';
import { ErrorState, Skeleton } from '../components/States';
import { toast } from '../lib/toast';
import { clusterByAnswer, isCommon, TOPICS, topicOf, type AnswerCluster } from './answerGroups';

/** Above this many common answers, topic groups start collapsed so /profile stays compact. */
const AUTO_COLLAPSE_THRESHOLD = 6;

function AnswerRow({ a, compact = false }: { a: SavedAnswer; compact?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(a.answer);
  const update = useUpdateAnswer();
  const forget = useForgetAnswer();
  const save = () =>
    update.mutate({ id: a.id, answer: text }, {
      onSuccess: () => setEditing(false),
      onError: (e) => toast.error(errorMessage(e, 'Could not save the answer')),
    });
  return (
    <li className={compact ? 'rounded-md border border-border/70 bg-surface p-2.5' : 'rounded-lg border border-border bg-surface-2/40 p-3'}>
      <div className="flex items-start gap-2">
        <p className="flex-1 text-xs font-medium text-text">{a.question}</p>
        <button type="button" onClick={() => setEditing((v) => !v)} aria-label={`Edit the answer to ${a.question}`} className="rounded p-1 text-faint hover:text-text">
          <Pencil className="size-3.5" />
        </button>
        <button type="button" disabled={forget.isPending} onClick={() => forget.mutate(a.id, { onError: (e) => toast.error(errorMessage(e, 'Could not forget the answer')) })} aria-label={`Forget the answer to ${a.question}`} className="rounded p-1 text-faint hover:text-bad">
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          {a.kind === 'long'
            ? <textarea className={`${INPUT_CLS} h-28 resize-y`} value={text} onChange={(e) => setText(e.target.value)} aria-label={`Answer to ${a.question}`} />
            : <input className={INPUT_CLS} value={text} onChange={(e) => setText(e.target.value)} aria-label={`Answer to ${a.question}`} />}
          <div className="flex justify-end gap-2">
            <button type="button" className="px-3 py-1.5 text-xs text-muted hover:text-text" onClick={() => { setText(a.answer); setEditing(false); }}>Cancel</button>
            <button type="button" disabled={update.isPending || !text.trim()} onClick={save}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg hover:bg-accent/85 disabled:opacity-60">
              {update.isPending && <LoaderCircle className="size-3.5 animate-spin" />} Save
            </button>
          </div>
        </div>
      ) : (
        <p className={`mt-1 whitespace-pre-line text-xs text-muted ${a.kind === 'long' ? 'line-clamp-3' : ''}`}>{a.answer}</p>
      )}
      <p className="mt-1.5 text-[11px] text-faint">
        {a.company ? `Last given for ${a.company}, ` : 'Last given '}{relTime(a.updated_at)}{a.uses > 1 ? ` · used ${a.uses} times` : ''}
      </p>
    </li>
  );
}

function ClusterRow({ cluster }: { cluster: AnswerCluster }) {
  const [showVariants, setShowVariants] = useState(false);
  if (cluster.variants.length === 1) {
    return <AnswerRow a={cluster.primary} />;
  }
  const rest = cluster.variants.slice(1);
  return (
    <li className="rounded-lg border border-border bg-surface-2/40 p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-text">{cluster.primary.question}</p>
          <p className={`mt-1 whitespace-pre-line text-xs text-muted ${cluster.primary.kind === 'long' ? 'line-clamp-3' : ''}`}>{cluster.primary.answer}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[10px] text-muted">
          <Layers className="size-3 text-faint" /> {cluster.variants.length}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-faint">
        <span>
          Used {cluster.totalUses} times across {cluster.variants.length} wordings
        </span>
        <button
          type="button"
          aria-expanded={showVariants}
          onClick={() => setShowVariants((v) => !v)}
          className="inline-flex items-center gap-1 font-medium text-muted hover:text-text"
        >
          <ChevronDown className={`size-3 transition-transform ${showVariants ? 'rotate-180' : ''}`} />
          {showVariants ? 'Hide wordings' : `Show ${rest.length} more wording${rest.length === 1 ? '' : 's'}`}
        </button>
      </div>
      {showVariants && (
        <ul className="mt-2.5 space-y-1.5 border-t border-border/70 pt-2.5">
          {cluster.variants.map((v) => <AnswerRow key={v.id} a={v} compact />)}
        </ul>
      )}
    </li>
  );
}

function TopicGroup({
  label,
  items,
  defaultOpen,
}: {
  label: string;
  items: SavedAnswer[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const clusters = clusterByAnswer(items);
  const topAnswer = clusters[0]?.primary.answer;
  const preview = topAnswer && topAnswer.length <= 40 ? topAnswer : null;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-2/50"
      >
        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold text-text">{label}</span>
          {!open && preview && (
            <span className="ml-2 truncate text-[11px] text-faint">· e.g. “{preview}”</span>
          )}
        </div>
        <span className="shrink-0 font-mono text-[11px] text-faint">{items.length}</span>
        <ChevronDown className={`size-3.5 shrink-0 text-faint transition-transform ${open ? 'rotate-180 text-text' : ''}`} />
      </button>
      {open && (
        <ul className="max-h-[340px] space-y-2 overflow-y-auto overscroll-contain border-t border-border p-3">
          {clusters.map((c) => <ClusterRow key={c.key} cluster={c} />)}
        </ul>
      )}
    </div>
  );
}

/**
 * Answers the Chrome extension remembered from application forms, which it
 * offers the next time a form asks the same question. Grouped by topic with
 * identical-answer duplicates folded so long profiles stay compact.
 */
export function SavedAnswers() {
  const q = useSavedAnswers();
  const forget = useForgetAnswer();
  const [filter, setFilter] = useState('');
  const [more, setMore] = useState(false);
  // Arriving from the extension's "saved answers" link.
  const top = useRef<HTMLDivElement>(null);
  const ready = q.isSuccess;
  useEffect(() => {
    // The section's own wrapper keeps clear of the page header (scroll-mt): scroll to it, not to this list.
    if (ready && window.location.hash === '#answers') (document.getElementById('answers') ?? top.current)?.scrollIntoView({ block: 'start' });
  }, [ready]);
  if (q.isPending) return <Skeleton className="h-32 w-full" />;
  if (q.isLoadingError) return <ErrorState message={errorMessage(q.error, 'Could not load your saved answers')} onRetry={() => void q.refetch()} />;
  const all = q.data.answers;
  if (!all.length) {
    return <p className="text-xs text-muted">None yet. When you fill an application with the extension, the answers you give are kept here and offered on the next form that asks.</p>;
  }
  const needle = filter.trim().toLowerCase();
  const common = all.filter(isCommon).sort((a, b) => b.uses - a.uses);
  const once = all.filter((a) => !isCommon(a));
  const found = needle ? all.filter((a) => `${a.question} ${a.answer} ${a.company}`.toLowerCase().includes(needle)) : [];

  const buckets = TOPICS.map((t) => ({
    id: t.id,
    label: t.label,
    items: common.filter((a) => topicOf(a) === t.id),
  })).filter((b) => b.items.length > 0);
  const startOpen = common.length <= AUTO_COLLAPSE_THRESHOLD;

  return (
    <div ref={top} className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint" />
          <input className={`${INPUT_CLS} pl-8`} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={`Search ${all.length} answers`} aria-label="Search saved answers" />
        </label>
        <button type="button" disabled={forget.isPending}
          onClick={() => window.confirm('Forget every saved answer? The extension will ask again on the next forms.') && forget.mutate(undefined, { onSuccess: () => toast.success('Saved answers forgotten.'), onError: (e) => toast.error(errorMessage(e, 'Could not forget the answers')) })}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:border-bad/40 hover:text-bad">
          Forget all
        </button>
      </div>
      {needle ? (
        <>
          <ul className="max-h-[400px] space-y-2 overflow-y-auto overscroll-contain">
            {found.map((a) => <AnswerRow key={a.id} a={a} />)}
          </ul>
          {!found.length && <p className="text-xs text-muted">No answer matches “{filter}”.</p>}
        </>
      ) : (
        <>
          {buckets.length > 0 && (
            <section aria-label="Asked on most forms" className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold tracking-wide text-muted uppercase">Asked on most forms ({common.length})</h3>
                {!startOpen && <span className="text-[11px] text-faint">Grouped by topic · click to expand</span>}
              </div>
              <div className="space-y-2">
                {buckets.map((b) => (
                  <TopicGroup key={`${b.id}-${startOpen}`} label={b.label} items={b.items} defaultOpen={startOpen} />
                ))}
              </div>
            </section>
          )}
          {once.length > 0 && (
            <section aria-label="Answered once" className="space-y-2">
              <button type="button" aria-expanded={more} onClick={() => setMore((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-text">
                <ChevronDown className={`size-3.5 transition-transform ${more ? 'rotate-180' : ''}`} />
                {once.length} answer{once.length === 1 ? '' : 's'} to one form's own questions
              </button>
              {more && (
                <ul className="max-h-[340px] space-y-2 overflow-y-auto overscroll-contain">
                  {once.map((a) => <AnswerRow key={a.id} a={a} />)}
                </ul>
              )}
              {!more && <p className="text-[11px] text-faint">Kept in case a form asks the same thing again. You don't need to look after them: change an answer on a form and Wera remembers the new one.</p>}
            </section>
          )}
        </>
      )}
    </div>
  );
}
