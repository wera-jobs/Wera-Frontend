import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarClock, Sparkles, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { useNotifications, useReadNotifications } from '../api/hooks';
import type { AppNotification } from '../api/types';
import { whenText } from '../lib/events';
import { relTime } from '../lib/format';

const ICON = { strong_matches: Sparkles, posting_closed: XCircle, reminder: CalendarClock };

/** The top bar's bell: new strong matches, closed postings and reminders. */
export function NotificationBell() {
  const { data } = useNotifications();
  const read = useReadNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const unread = data?.unread ?? 0;
  const items = data?.notifications ?? [];
  const go = (n: AppNotification) => {
    if (!n.read_at) read.mutate([n.id]);
    setOpen(false);
    void navigate(n.kind === 'strong_matches' ? '/' : n.job_id ? `/jobs?job=${n.job_id}` : '/tracker');
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative inline-flex size-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 font-semibold text-bg">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="anim-rise fixed inset-x-4 top-14 z-50 rounded-xl border border-border bg-bg shadow-xl sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold text-text">Notifications</h2>
            {unread > 0 && (
              <button type="button" onClick={() => read.mutate([])} className="text-xs font-medium text-accent hover:underline">
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted">
              Nothing yet. New strong matches, postings you track closing, and interview reminders show up here.
            </p>
          ) : (
            <ul className="max-h-[60svh] overflow-y-auto py-1">
              {items.map((n) => {
                const Icon = ICON[n.kind];
                return (
                  <li key={n.id}>
                    <button type="button" onClick={() => go(n)} className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-surface-2">
                      <Icon className={clsx('mt-0.5 size-4 shrink-0', n.kind === 'posting_closed' ? 'text-faint' : 'text-accent')} />
                      <span className="min-w-0 flex-1">
                        <span className={clsx('block text-xs', n.read_at ? 'text-muted' : 'font-semibold text-text')}>
                          {n.title}
                          {n.at && <span className="font-normal text-muted">{` · ${whenText(n.at)}`}</span>}
                        </span>
                        {n.body && <span className="mt-0.5 block truncate text-xs text-muted">{n.body}</span>}
                        <span className="mt-0.5 block text-[11px] text-faint">{relTime(n.created_at)}</span>
                      </span>
                      {!n.read_at && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
