// Drafts of the emails around an application (follow-up, thank-you,
// referral request, offer reply), written by Wera from the profile, the
// job and the tracker. The user copies or opens them in their mail app;
// Wera never sends anything.
import { useState } from 'react';
import { Copy, Mail, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { errorMessage } from '../api/client';
import { useEmailDraft, type EmailKind } from '../api/hooks';
import type { JobDetail } from '../api/types';
import { toast } from '../lib/toast';

const KINDS: [EmailKind, string][] = [
  ['follow_up', 'Follow-up'],
  ['thank_you', 'Thank-you'],
  ['referral_request', 'Referral request'],
  ['offer_reply', 'Offer reply'],
];

const FIELD =
  'w-full rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-text placeholder:text-faint focus:border-accent/60 focus:outline-none';

export function EmailDrafts({ job }: { job: JobDetail }) {
  const draft = useEmailDraft();
  const [kind, setKind] = useState<EmailKind | null>(null);
  const [steer, setSteer] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [needs, setNeeds] = useState('');
  const [problem, setProblem] = useState('');

  const write = (k: EmailKind) => {
    setKind(k);
    setProblem('');
    draft.mutate(
      { id: job.id, kind: k, request: steer },
      {
        onSuccess: (d) => {
          setSubject(d.subject);
          setBody(d.body);
          setNeeds(d.needs);
        },
        onError: (err) => {
          setBody('');
          setProblem(errorMessage(err, 'network error'));
        },
      },
    );
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      toast.success('Copied. Paste it into your email.');
    } catch {
      toast.error("Couldn't copy: select the text and copy it yourself.");
    }
  };
  const to = job.contact?.link && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(job.contact.link) ? job.contact.link : '';
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div>
      <span className="mb-1 flex items-center gap-1.5 text-[11px] text-muted">
        <Sparkles className="size-3.5 text-accent" /> Email drafts
      </span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Draft an email">
        {KINDS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            disabled={draft.isPending}
            onClick={() => write(k)}
            className={clsx(
              'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60',
              kind === k ? 'border-accent/50 bg-accent/10 text-accent' : 'border-border text-muted hover:text-text',
            )}
          >
            {draft.isPending && kind === k ? 'Writing…' : label}
          </button>
        ))}
      </div>
      <input
        aria-label="Anything the draft should say or stress"
        value={steer}
        onChange={(e) => setSteer(e.target.value)}
        maxLength={500}
        placeholder="Optional: what to stress, like the Kubernetes upgrade we discussed"
        className={`mt-2 ${FIELD}`}
      />
      {problem && <p className="mt-2 text-xs text-bad">{problem}</p>}
      {body && (
        <div className="mt-2 space-y-2 rounded-lg border border-border p-2.5">
          <input aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={FIELD} />
          <textarea aria-label="Email" value={body} onChange={(e) => setBody(e.target.value)} rows={9} className={`${FIELD} resize-y leading-relaxed`} />
          {needs && (
            <p className="rounded-md bg-warn/10 px-2.5 py-1.5 text-xs text-text">
              <span className="font-semibold">You could add: </span>
              {needs}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg hover:bg-accent/85">
              <Copy className="size-3.5" /> Copy
            </button>
            <a href={mailto} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text hover:border-accent/40">
              <Mail className="size-3.5" /> Open in your mail app
            </a>
            <span className="text-[11px] text-faint">Read it first: Wera never sends anything.</span>
          </div>
        </div>
      )}
    </div>
  );
}
