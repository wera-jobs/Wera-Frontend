// "Find someone to refer you" in the job view: LinkedIn people searches
// built from the user's schools and employers (Wera reads nothing from
// LinkedIn), and a short connection note drafted from their profile.
import { useState } from 'react';
import { Copy, ExternalLink, Sparkles } from 'lucide-react';
import { api, errorMessage } from '../api/client';
import { useApplicant } from '../api/extension';
import { referralQuestion, referralSearches } from '../lib/referrals';
import { toast } from '../lib/toast';

export function Referrals({ jobId, company, title }: { jobId: number; company: string; title: string }) {
  const me = useApplicant();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const searches = referralSearches(company, title, me.data);
  if (!searches.length) return null;

  const draft = async () => {
    setBusy(true);
    setProblem('');
    try {
      const a = await api<{ answer?: string; needs_input?: string }>('/api/ext/answer', {
        method: 'POST',
        body: JSON.stringify({ question: referralQuestion(company, title), job_id: jobId, max_words: 60 }),
      });
      if (a.answer?.trim()) setNote(a.answer.trim());
      else setProblem(a.needs_input || 'Wera could not write a note this time. Try again.');
    } catch (err) {
      setProblem(`Couldn't write a note: ${errorMessage(err, 'network error')}`);
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(note);
      toast.success('Note copied.');
    } catch {
      toast.error("Couldn't copy: select the note and copy it yourself.");
    }
  };

  return (
    <div className="space-y-2.5">
      <p className="text-xs text-muted">A referral moves an application to the top of the pile. Start with people you share something with.</p>
      <ul className="space-y-1">
        {searches.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
              {s.label} <ExternalLink className="size-3" />
            </a>
          </li>
        ))}
      </ul>
      {note ? (
        <div className="space-y-1.5">
          <textarea
            aria-label="Your note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            className="w-full resize-y rounded-lg border border-border bg-surface-2 p-2 text-xs text-text"
          />
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-bg hover:bg-accent/85">
              <Copy className="size-3.5" /> Copy note
            </button>
            <span className={`text-[11px] ${note.length > 300 ? 'text-bad' : 'text-faint'}`}>{note.length}/300 for a LinkedIn note</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void draft()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text hover:border-accent/40 disabled:opacity-60"
        >
          <Sparkles className="size-3.5 text-accent" /> {busy ? 'Writing…' : 'Draft a note to send'}
        </button>
      )}
      {problem && <p className="text-xs text-bad">{problem}</p>}
    </div>
  );
}
