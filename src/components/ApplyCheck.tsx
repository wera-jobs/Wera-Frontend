import { useEffect, useState } from 'react';
import { CircleHelp, X } from 'lucide-react';
import { inReview, useJob, useStatusWithUndo } from '../api/hooks';

/** Back sooner than this, the user only glanced at the posting. */
export const MIN_AWAY_MS = 20_000;
/** Back later than this, the moment has passed. */
export const MAX_AWAY_MS = 6 * 60 * 60_000;

/**
 * When the user opens a job's posting (any link marked data-wera-job) and
 * comes back to Wera a while later, asks whether they applied, so the job
 * leaves Today and lands in the tracker without a trip there. A job the
 * extension already marked applied, or one the user dealt with, is not
 * asked about.
 */
export function ApplyCheck() {
  const [askId, setAskId] = useState<number | null>(null);

  useEffect(() => {
    let opened: { id: number; at: number } | null = null;
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[data-wera-job]');
      const id = Number(link?.getAttribute('data-wera-job'));
      if (id) opened = { id, at: Date.now() };
    };
    const onBack = () => {
      if (document.visibilityState !== 'visible' || !opened) return;
      const away = Date.now() - opened.at;
      if (away >= MIN_AWAY_MS && away <= MAX_AWAY_MS) setAskId(opened.id);
      opened = null;
    };
    document.addEventListener('click', onClick, true);
    // Middle-click and Ctrl+click open a tab without a click event.
    document.addEventListener('auxclick', onClick, true);
    document.addEventListener('visibilitychange', onBack);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('auxclick', onClick, true);
      document.removeEventListener('visibilitychange', onBack);
    };
  }, []);

  return askId == null ? null : <Ask jobId={askId} onDone={() => setAskId(null)} />;
}

function Ask({ jobId, onDone }: { jobId: number; onDone: () => void }) {
  // Fresh from the server: the extension may have marked it applied meanwhile.
  const { data: job, isFetching } = useJob(jobId);
  const setStatus = useStatusWithUndo();
  if (!job || isFetching || !inReview(job.application_status)) return null;
  const answer = (applied: boolean) => {
    if (applied) setStatus(job, 'applied');
    onDone();
  };
  return (
    <div
      role="dialog"
      aria-label="Did you apply?"
      className="anim-rise fixed bottom-20 left-1/2 z-[90] w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 rounded-card border border-accent/30 bg-surface p-4 shadow-2xl lg:bottom-6"
    >
      <div className="flex items-start gap-3">
        <CircleHelp className="mt-0.5 size-5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text">Did you apply?</p>
          <p className="mt-0.5 truncate text-xs text-muted" title={`${job.title} at ${job.company}`}>
            {job.title} at {job.company}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => answer(true)}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg transition-colors hover:bg-accent/85"
            >
              Yes, mark it applied
            </button>
            <button
              onClick={() => answer(false)}
              className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-accent/40"
            >
              Not yet
            </button>
          </div>
        </div>
        <button onClick={onDone} aria-label="Close" className="rounded-lg p-1 text-faint transition-colors hover:text-text">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
