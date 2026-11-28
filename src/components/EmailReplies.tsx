import { useState } from 'react';
import clsx from 'clsx';
import { Check, Copy, ExternalLink, LoaderCircle, MailCheck, X } from 'lucide-react';
import { useDecideSuggestion, useEmailSuggestions, useInboundAddress, useSetInboundAddress, type EmailSuggestion } from '../api/inbound';
import { errorMessage } from '../api/client';
import { copyText } from '../lib/clipboard';
import { relTime } from '../lib/format';
import { toast } from '../lib/toast';

/** A Gmail search for the mail tracking systems send: the filter to forward. */
export const GMAIL_FILTER =
  'from:(greenhouse-mail.io OR hire.lever.co OR ashbyhq.com OR myworkday.com OR icims.com OR smartrecruiters.com OR workablemail.com) OR subject:("your application" OR interview OR offer)';

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() =>
        void copyText(text).then((ok) => {
          if (!ok) return toast.error("Couldn't copy.");
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        })
      }
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted hover:text-text"
    >
      {done ? <Check className="size-3" /> : <Copy className="size-3" />} {done ? 'Copied' : 'Copy'}
    </button>
  );
}

/**
 * Settings: the user's forwarding address for recruiter replies. Wera reads
 * what arrives, matches it to a tracked job and suggests a status for the
 * user to approve; it keeps only the match, the sender's domain and the
 * subject.
 */
export function EmailRepliesSettings() {
  const setup = useInboundAddress();
  const set = useSetInboundAddress();
  if (setup.isLoading) return <div className="skeleton h-16 w-full" />;
  const d = setup.data;
  if (!d?.available) {
    return <p className="text-xs text-muted">Email replies are not set up on this server yet.</p>;
  }
  const toggle = (on: boolean) => set.mutate(on, { onError: (e) => toast.error(errorMessage(e)) });
  if (!d.address) {
    return (
      <div className="space-y-2">
        <p className="text-xs leading-relaxed text-muted">
          Get a private address to forward recruiter replies to, by hand or with a Gmail or Outlook rule. Wera matches each reply to a job on
          your tracker and suggests the new status (interviewing, rejected, offer); nothing changes until you accept. Wera never sees your
          inbox, and it keeps only the match, the sender's domain and the subject, never the message.
        </p>
        <button
          type="button"
          onClick={() => toggle(true)}
          disabled={set.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg hover:bg-accent/85 disabled:opacity-60"
        >
          {set.isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : <MailCheck className="size-3.5" />} Turn on email replies
        </button>
      </div>
    );
  }
  const s = d.setup;
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-muted">Your forwarding address</div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <code className="min-w-0 break-all rounded-md bg-surface-2 px-2 py-1 font-mono text-xs text-text">{d.address}</code>
          <CopyButton text={d.address} label="Copy address" />
        </div>
        <p className="mt-1 text-[11px] text-faint">
          {s?.last_email_at ? `Last email ${relTime(s.last_email_at)}.` : 'No email yet.'} Keep it private: anyone with it can send you suggestions.
        </p>
      </div>
      {s?.confirm_code || s?.confirm_url ? (
        <div className="rounded-lg border border-accent/25 bg-accent/5 px-3 py-2.5 text-xs text-muted">
          <div className="font-medium text-text">Gmail asked to confirm forwarding</div>
          {s.confirm_code && (
            <div className="mt-1">
              Confirmation code: <code className="font-mono text-text">{s.confirm_code}</code>
            </div>
          )}
          {s.confirm_url && (
            <a href={s.confirm_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-accent-2 underline underline-offset-2">
              Confirm in Gmail <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      ) : null}
      <details className="text-xs text-muted">
        <summary className="cursor-pointer font-medium text-text">Forward replies automatically</summary>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-relaxed">
          <li>
            Gmail: Settings, Forwarding and POP/IMAP, Add a forwarding address, and paste the address above. Gmail sends a code here; it shows
            above within a minute.
          </li>
          <li>
            Then create a filter (search options, Create filter) with this search, choose "Forward it to" your Wera address:
            <div className="mt-1 flex items-start gap-2">
              <code className="min-w-0 flex-1 break-words rounded-md bg-surface-2 px-2 py-1 font-mono text-[11px] text-text">{GMAIL_FILTER}</code>
              <CopyButton text={GMAIL_FILTER} label="Copy Gmail search" />
            </div>
          </li>
          <li>Outlook: Settings, Mail, Rules, Add new rule, with "Forward to" your Wera address.</li>
          <li>Or forward a single reply by hand: Wera reads the original sender from the forwarded message.</li>
        </ol>
      </details>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={set.isPending}
          onClick={() => {
            if (window.confirm('Get a new address? Mail to the old one will bounce, so update your forwarding rules.')) toggle(true);
          }}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-text"
        >
          New address
        </button>
        <button
          type="button"
          disabled={set.isPending}
          onClick={() => {
            if (window.confirm('Turn off email replies? Mail to your address will bounce.')) toggle(false);
          }}
          className="rounded-lg px-3 py-1.5 text-xs text-muted hover:text-bad"
        >
          Turn off
        </button>
      </div>
    </div>
  );
}

const KIND_TEXT: Record<EmailSuggestion['kind'], string> = {
  rejection: 'A rejection',
  offer: 'An offer',
  interview: 'An interview invitation',
  assessment: 'An assessment',
  received: 'An application receipt',
};

const STATUS_TEXT: Record<EmailSuggestion['status'], string> = {
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
};

/**
 * Tracker: replies Wera matched to tracked jobs, each with the status it
 * suggests. Nothing changes until the user accepts.
 */
export function EmailSuggestions({ onOpen }: { onOpen?: (jobId: number) => void }) {
  const list = useEmailSuggestions();
  const decide = useDecideSuggestion();
  const items = list.data?.suggestions ?? [];
  if (!items.length) return null;
  const act = (s: EmailSuggestion, accept: boolean) =>
    decide.mutate(
      { id: s.id, accept },
      {
        onSuccess: () => accept && toast.success(`${s.company}: moved to ${STATUS_TEXT[s.status]}.`),
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  return (
    <section aria-label="Suggestions from your email" className="rounded-card border border-accent/25 bg-accent/5 p-3">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold text-text">
        <MailCheck className="size-3.5 text-accent" /> From your email ({items.length})
      </h2>
      <ul className="mt-2 divide-y divide-border/60">
        {items.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2 text-xs">
            <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
              <button type="button" onClick={() => onOpen?.(s.job_id)} className="text-left font-medium text-text hover:underline">
                {s.company}, {s.title}
              </button>
              <div className="truncate text-muted" title={s.subject}>
                {KIND_TEXT[s.kind]} from {s.from_domain} {relTime(s.received_at)}: "{s.subject}"
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => act(s, true)}
                className={clsx(
                  'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold',
                  s.status === 'rejected' ? 'bg-surface-2 text-text hover:bg-surface-2/70' : 'bg-accent text-bg hover:bg-accent/85',
                )}
              >
                <Check className="size-3" /> Move to {STATUS_TEXT[s.status]}
              </button>
              <button type="button" aria-label={`Dismiss the suggestion for ${s.company}`} onClick={() => act(s, false)} className="rounded-lg p-1 text-muted hover:text-text">
                <X className="size-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
