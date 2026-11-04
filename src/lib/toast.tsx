import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import clsx from 'clsx';

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface ToastItem {
  id: number;
  kind: 'success' | 'error';
  text: string;
  /** One button beside the text, such as Undo; pressing it closes the toast. */
  action?: ToastAction;
}

const listeners = new Set<(t: ToastItem) => void>();
let seq = 0;

function emit(kind: ToastItem['kind'], text: string, action?: ToastAction) {
  const item: ToastItem = { id: ++seq, kind, text, action };
  for (const l of listeners) l(item);
}

export const toast = {
  success: (text: string, action?: ToastAction) => emit('success', text, action),
  error: (text: string, action?: ToastAction) => emit('error', text, action),
};

const TTL = 4200;
/** A toast with an action stays longer: there is something to decide. */
const TTL_ACTION = 7000;

export function Toasts() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handle = (t: ToastItem) => {
      setItems((xs) => [...xs, t]);
      window.setTimeout(() => {
        setItems((xs) => xs.filter((x) => x.id !== t.id));
      }, t.action ? TTL_ACTION : TTL);
    };
    listeners.add(handle);
    return () => {
      listeners.delete(handle);
    };
  }, []);

  return (
    <div role="status" aria-live="polite" className="fixed right-4 bottom-20 z-[100] lg:bottom-4 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={clsx(
            'fade-enter flex items-start gap-2.5 rounded-card border bg-surface px-4 py-3 text-sm shadow-xl',
            t.kind === 'success' ? 'border-good/30' : 'border-bad/30',
          )}
        >
          {t.kind === 'success' ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-good" />
          ) : (
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-bad" />
          )}
          <span className="min-w-0 break-words text-text">{t.text}</span>
          {t.action && (
            <button
              onClick={() => {
                setItems((xs) => xs.filter((x) => x.id !== t.id));
                t.action!.run();
              }}
              className="ml-auto shrink-0 rounded-md px-1.5 text-sm font-semibold text-accent hover:underline"
            >
              {t.action.label}
            </button>
          )}
          <button
            onClick={() => setItems((xs) => xs.filter((x) => x.id !== t.id))}
            className={clsx('shrink-0 text-faint transition-colors hover:text-text', !t.action && 'ml-auto')}
            aria-label="Dismiss notification"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
