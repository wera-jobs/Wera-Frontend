import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { useProfile, useSaveProfile, useTuneSuggestions } from '../api/profile';
import type { TuneSuggestion } from '../api/types';
import { toast } from '../lib/toast';

const DISMISSED = 'wera.tuneDismissed';

function readDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED) ?? '[]') as string[];
  } catch {
    return [];
  }
}

/**
 * Suggests a preference change when the user keeps passing on jobs for the
 * same reason. Nothing changes until they accept; Not now hides that
 * suggestion until it changes (say, a different years limit).
 */
export function TuneSuggestions() {
  const { data } = useTuneSuggestions();
  const profile = useProfile();
  const save = useSaveProfile();
  const [dismissed, setDismissed] = useState(readDismissed);
  const shown = (data?.suggestions ?? []).filter((s) => !dismissed.includes(s.text));
  if (shown.length === 0) return null;
  const s = shown[0];

  const hide = (t: TuneSuggestion) => {
    const next = [...dismissed, t.text];
    setDismissed(next);
    try {
      localStorage.setItem(DISMISSED, JSON.stringify(next.slice(-50)));
    } catch {
      // Private windows may refuse storage: it stays hidden for this visit.
    }
  };
  const accept = () => {
    const p = profile.data;
    if (!p || !s.preferences) return;
    save.mutate(
      { markdown: p.markdown, preferences: s.preferences, answers: p.answers },
      {
        onSuccess: () => {
          hide(s);
          toast.success('Preferences updated. Your matches are being refreshed.');
        },
        onError: () => toast.error("Couldn't update your preferences. Try again from your profile."),
      },
    );
  };

  return (
    <section aria-labelledby="tune-title" className="anim-rise flex items-start gap-3 rounded-card border border-accent/30 bg-accent/5 p-4">
      <SlidersHorizontal className="mt-0.5 size-5 shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <h2 id="tune-title" className="text-sm font-semibold text-text">
          {s.text}
        </h2>
        <p className="mt-0.5 text-xs text-muted">Based on the reasons you gave. Nothing changes unless you say so.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {s.preferences ? (
            <button
              type="button"
              onClick={accept}
              disabled={save.isPending || !profile.data}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg transition-colors hover:bg-accent/85 disabled:opacity-60"
            >
              {save.isPending ? 'Saving…' : 'Yes, update'}
            </button>
          ) : (
            <Link to="/profile#want" className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg transition-colors hover:bg-accent/85">
              Review preferences
            </Link>
          )}
          <button
            type="button"
            onClick={() => hide(s)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-text"
          >
            Not now
          </button>
        </div>
      </div>
    </section>
  );
}
