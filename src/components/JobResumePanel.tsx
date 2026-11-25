import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { Download, ExternalLink, Eye, FileText, GitCompare, LoaderCircle, RefreshCw, Wand2 } from 'lucide-react';
import { errorMessage } from '../api/client';
import { ErrorState } from './States';
import { useJobKeywords, useJobResume, useResume, useTailorResume, type Coverage } from '../api/resumes';
import type { JobDetail } from '../api/types';
import { diffResume } from '../resume/diff';
import { ResumePreview } from '../resume/ResumePreview';
import { useLivePreview } from '../resume/useLivePreview';
import { toast } from '../lib/toast';

export function CoverageChips({ coverage, label }: { coverage: Coverage; label: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 text-xs">
        <span className="font-medium text-text">{label}</span>
        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
          <span className="block h-full rounded-full bg-good" style={{ width: `${coverage.percent}%` }} />
        </span>
        <span className="font-mono text-muted">{coverage.percent}%</span>
      </div>
      <div className="flex flex-wrap gap-1 text-[11px]">
        {coverage.matched.map((k) => <span key={k} className="rounded-full bg-good/10 px-2 py-0.5 text-good">{k}</span>)}
        {coverage.missing.map((k) => (
          <span key={k} className="rounded-full bg-warn/10 px-2 py-0.5 text-warn" title="Not on your resume. Add it only if it is true.">{k}</span>
        ))}
      </div>
    </div>
  );
}

/** The job view's Resume tab: keyword coverage, tailored copy, and before/after diff. */
export function JobResumePanel({ job }: { job: JobDetail }) {
  const kw = useJobKeywords(job.id);
  const tailored = useJobResume(job.id);
  const tailor = useTailorResume(job.id);
  const doc = tailored.data ?? null;
  const base = useResume(doc ? (kw.data?.resume_id ?? null) : null);
  const preview = useLivePreview(doc?.data ?? null, doc?.layout ?? null);
  const [mode, setMode] = useState<'preview' | 'diff'>('preview');
  const noBase = kw.data && kw.data.resume_id == null;

  const changes = useMemo(
    () => (base.data && doc ? diffResume(base.data.data, doc.data) : []),
    [base.data, doc],
  );

  const run = () => tailor.mutate(undefined, {
    onSuccess: (r) => toast.success(r.resume.fit?.one_page ? 'Tailored and fitted to one page.' : 'Tailored.'),
    onError: (e) => toast.error(errorMessage(e, 'Could not tailor')),
  });

  if (kw.isLoading || tailored.isLoading) return <div className="skeleton h-72 w-full" />;
  // A failed read is not "no tailored copy": tailoring again would replace it.
  const failed = (kw.isError && !kw.data) || (tailored.isError && tailored.data === undefined);
  if (failed) {
    return (
      <ErrorState
        message={errorMessage(kw.error ?? tailored.error)}
        onRetry={() => {
          void kw.refetch();
          void tailored.refetch();
        }}
      />
    );
  }
  if (noBase) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-border px-6 py-12 text-center">
        <FileText className="size-5 text-accent" />
        <p className="text-sm font-semibold">Set up your resume first</p>
        <p className="max-w-sm text-xs text-muted">Import your LaTeX resume or your uploaded PDF once; then every job gets a tailored, one-page copy in a click.</p>
        <Link to="/profile/resume" className="mt-1 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-bg hover:bg-accent/85">Set up my resume</Link>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {kw.data?.coverage && kw.data.keywords.length > 0 && (
        <CoverageChips coverage={kw.data.coverage} label={doc ? 'Tailored resume covers' : 'Your resume covers'} />
      )}
      {!doc ? (
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="text-xs leading-relaxed text-muted">
            Tailor a copy of your resume for {job.company}: the AI reorders skills and rewords bullets toward this posting
            using only what your resume says, then it is fitted to one page. Your main resume is not changed.
          </p>
          <button onClick={run} disabled={tailor.isPending}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-bg hover:bg-accent/85 disabled:opacity-60">
            {tailor.isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
            {tailor.isPending ? 'Tailoring…' : 'Tailor my resume'}
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <Link to={`/profile/resume/${doc.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg hover:bg-accent/85">
              <ExternalLink className="size-3.5" /> Edit
            </Link>
            <a href={`/api/resumes/${doc.id}/pdf?download=1`} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium hover:border-accent/40">
              <Download className="size-3.5" /> PDF
            </a>
            <button onClick={run} disabled={tailor.isPending} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted hover:text-text">
              {tailor.isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Tailor again
            </button>
            {base.data && (
              <div role="group" aria-label="Resume view" className="ml-auto inline-flex rounded-lg border border-border bg-surface-2 p-0.5 text-xs">
                <button
                  type="button"
                  aria-pressed={mode === 'preview'}
                  onClick={() => setMode('preview')}
                  className={clsx('inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium', mode === 'preview' ? 'bg-surface text-text shadow-2xs' : 'text-muted hover:text-text')}
                >
                  <Eye className="size-3" /> Preview
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'diff'}
                  onClick={() => setMode('diff')}
                  className={clsx('inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium', mode === 'diff' ? 'bg-surface text-text shadow-2xs' : 'text-muted hover:text-text')}
                >
                  <GitCompare className="size-3" /> Changes{changes.length > 0 ? ` (${changes.length})` : ''}
                </button>
              </div>
            )}
          </div>
          {doc.fit_score && (
            <p className="text-xs text-muted" aria-label="Fit score with the tailored resume">
              Fit score with this resume:{' '}
              {doc.fit_score.after !== doc.fit_score.before && <><span className="font-mono">{doc.fit_score.before}</span> → </>}
              <span className={clsx('font-mono font-semibold', doc.fit_score.after > doc.fit_score.before ? 'text-good' : 'text-text')}>{doc.fit_score.after}</span>
            </p>
          )}
          {doc.notes.length > 0 && <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted">{doc.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
          {mode === 'diff' && base.data ? (
            changes.length === 0 ? (
              <p className="rounded-card border border-border bg-surface-2/40 p-4 text-xs text-muted">
                No bullet or skill text changes from your base resume (layout or ordering may still have been adjusted to fit one page).
              </p>
            ) : (
              <ul className="space-y-2.5" aria-label="Tailored resume changes">
                {changes.map((c, idx) => (
                  <li key={`${c.section}-${c.context}-${idx}`} className="rounded-card border border-border bg-surface p-3 text-xs">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="font-semibold text-text">{c.section} <span className="font-normal text-muted">· {c.context}</span></span>
                      <span className={clsx(
                        'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase',
                        c.kind === 'changed' ? 'bg-accent/10 text-accent' : c.kind === 'added' ? 'bg-good/10 text-good' : 'bg-surface-2 text-faint',
                      )}>
                        {c.kind}
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {c.before && (
                        <div className="rounded-md border border-bad/20 bg-bad/5 p-2 text-muted">
                          <div className="mb-0.5 font-mono text-[10px] text-bad uppercase">Before</div>
                          <p className="leading-relaxed">{c.before}</p>
                        </div>
                      )}
                      {c.after && (
                        <div className="rounded-md border border-good/20 bg-good/5 p-2 text-text">
                          <div className="mb-0.5 font-mono text-[10px] text-good uppercase">After</div>
                          <p className="leading-relaxed">{c.after}</p>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <ResumePreview {...preview} />
          )}
        </>
      )}
    </div>
  );
}
