// Ask Wera: conversations grounded on the user's own data, the general
// ones and those started from a job, with the list to go back to them.
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { Plus } from 'lucide-react';
import { useAssistantThreads, useDeleteAllThreads } from '../api/assistant';
import { errorMessage } from '../api/client';
import { AssistantChat } from '../components/AssistantChat';
import { toast } from '../lib/toast';
import { useDocumentTitle } from '../lib/useDocumentTitle';

export default function AskPage() {
  useDocumentTitle('Ask Wera');
  const [params, setParams] = useSearchParams();
  const id = Number(params.get('thread')) || null;
  const threads = useAssistantThreads();
  const clear = useDeleteAllThreads();
  const open = (t: number | null) => setParams(t ? { thread: String(t) } : {}, { replace: true });
  const list = threads.data?.threads ?? [];

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-5xl flex-col gap-4 pb-4">
      <header>
        <h1 className="text-[28px] leading-tight font-semibold">Ask Wera</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Questions about your search, answered from your profile, resume, application details and tracker. To ask about one job, open it
          and choose Ask Wera.
        </p>
      </header>
      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[14rem_1fr]">
        <nav aria-label="Conversations" className="flex min-h-0 flex-col gap-1 overflow-y-auto max-md:max-h-32">
          <button
            type="button"
            onClick={() => open(null)}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium',
              id == null ? 'bg-accent/10 text-accent' : 'text-muted hover:text-text',
            )}
          >
            <Plus className="size-3.5" /> New conversation
          </button>
          {list.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => open(t.id)}
              aria-current={t.id === id ? 'true' : undefined}
              className={clsx(
                'truncate rounded-lg px-2.5 py-1.5 text-left text-xs',
                t.id === id ? 'bg-surface-2 text-text' : 'text-muted hover:text-text',
              )}
              title={t.title}
            >
              {t.title}
            </button>
          ))}
          {list.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (!window.confirm('Delete all your conversations with Wera?')) return;
                clear.mutate(undefined, { onSuccess: () => open(null), onError: (e) => toast.error(errorMessage(e)) });
              }}
              className="mt-2 px-2.5 text-left text-[11px] text-faint hover:text-bad"
            >
              Delete all conversations
            </button>
          )}
        </nav>
        <AssistantChat key={id ?? 'new'} threadId={id} onThread={open} className="min-h-0 rounded-card border border-border bg-surface/60 p-4" />
      </div>
    </div>
  );
}
