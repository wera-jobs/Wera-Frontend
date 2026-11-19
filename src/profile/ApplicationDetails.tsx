import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, LoaderCircle, Sparkles } from 'lucide-react';
import { errorMessage } from '../api/client';
import { Link } from 'react-router-dom';
import { useApplicant, useDetailsConflicts, useResolveConflict, useSaveApplicant, useSuggestApplicant, type Applicant, type ResumeJob, type ResumeSchool } from '../api/extension';
import { INPUT_CLS } from '../lib/styles';
import { Skeleton } from '../components/States';
import { toast } from '../lib/toast';
import { useUnsavedGuard } from '../lib/useUnsavedGuard';

type Key = keyof Applicant;

const DECLINE = { value: 'decline', label: 'Prefer not to say' };
const NOT_SET = { value: '', label: 'Not set: ask me on the form' };
const YES_NO = [{ value: '', label: 'Not set' }, { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }];
const opts = (...values: string[]) => values.map((v) => ({ value: v, label: v }));

const GROUPS: { title: string; hint?: string; fields: { key: Key; label: string; options?: { value: string; label: string }[]; wide?: boolean }[] }[] = [
  {
    title: 'Contact',
    fields: [
      { key: 'first_name', label: 'First name' }, { key: 'middle_name', label: 'Middle name' },
      { key: 'last_name', label: 'Last name' }, { key: 'preferred_name', label: 'Preferred name' },
      { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' },
      { key: 'address', label: 'Street address' }, { key: 'address_line2', label: 'Apartment, suite (optional)' },
      { key: 'city', label: 'City' }, { key: 'state', label: 'State or province' },
      { key: 'postal_code', label: 'ZIP or postal code' }, { key: 'country', label: 'Country' },
    ],
  },
  {
    title: 'Links',
    fields: [
      { key: 'linkedin', label: 'LinkedIn' }, { key: 'github', label: 'GitHub' },
      { key: 'portfolio', label: 'Portfolio or website' }, { key: 'twitter', label: 'X (Twitter)' },
      { key: 'other_link', label: 'Other link', wide: true },
    ],
  },
  {
    title: 'Work authorization and eligibility',
    hint: 'Answered the way forms ask. Wera fills these only when you set them.',
    fields: [
      { key: 'authorized_to_work', label: 'Authorized to work in the US', options: YES_NO },
      { key: 'needs_sponsorship', label: 'Will need visa sponsorship', options: YES_NO },
      { key: 'visa_status', label: 'Current visa or status (e.g. F-1 OPT, H-1B, citizen)' },
      { key: 'citizenship', label: 'Citizenship (country)' },
      { key: 'over_18', label: 'At least 18 years old', options: YES_NO },
      { key: 'security_clearance', label: 'Security clearance (e.g. None, Secret)' },
      { key: 'willing_to_relocate', label: 'Willing to relocate', options: YES_NO },
      { key: 'willing_to_travel', label: 'Willing to travel for work', options: YES_NO },
    ],
  },
  {
    title: 'Experience and education',
    fields: [
      { key: 'current_company', label: 'Current or last company' }, { key: 'current_title', label: 'Current or last title' },
      { key: 'years_experience', label: 'Years of experience' }, { key: 'school', label: 'School' },
      { key: 'degree', label: 'Degree' }, { key: 'major', label: 'Major' },
      { key: 'graduation_year', label: 'Graduation year' }, { key: 'gpa', label: 'GPA (optional)' },
    ],
  },
  {
    title: 'Other questions',
    fields: [
      { key: 'salary_expectation', label: 'Salary expectation' }, { key: 'start_date', label: 'Earliest start date' },
      { key: 'notice_period', label: 'Notice period (e.g. Two weeks)' },
      { key: 'work_preference', label: 'Preferred work arrangement', options: [{ value: '', label: 'Not set' }, { value: 'remote', label: 'Remote' }, { value: 'hybrid', label: 'Hybrid' }, { value: 'onsite', label: 'Onsite' }, { value: 'any', label: 'Any' }] },
      { key: 'languages', label: 'Languages you speak (e.g. English, Swahili)' },
      { key: 'how_heard', label: 'How you heard about jobs' },
    ],
  },
  {
    title: 'Voluntary self-identification',
    hint: 'US employers ask these for equal-opportunity reporting, and answering is optional. Wera fills what you set here; while one is not set, the extension asks you on the form and saves your answer here. They go only into forms you fill, never to the AI.',
    fields: [
      { key: 'gender', label: 'Gender', options: [NOT_SET, ...opts('Male', 'Female', 'Non-binary'), DECLINE] },
      { key: 'pronouns', label: 'Pronouns' },
      { key: 'transgender', label: 'Transgender', options: [NOT_SET, { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, DECLINE] },
      { key: 'sexual_orientation', label: 'Sexual orientation', options: [NOT_SET, ...opts('Heterosexual or straight', 'Gay or lesbian', 'Bisexual', 'Asexual', 'Pansexual', 'Queer'), DECLINE] },
      { key: 'hispanic', label: 'Hispanic or Latino', options: [NOT_SET, { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, DECLINE] },
      { key: 'race', label: 'Race', options: [NOT_SET, ...['American Indian or Alaska Native', 'Asian', 'Black or African American', 'Native Hawaiian or Other Pacific Islander', 'White', 'Two or more races'].map((r) => ({ value: r, label: r })), DECLINE] },
      { key: 'veteran', label: 'Veteran status', options: [NOT_SET, { value: 'I am not a protected veteran', label: 'Not a protected veteran' }, { value: 'I am a protected veteran', label: 'Protected veteran' }, DECLINE] },
      { key: 'disability', label: 'Disability', options: [NOT_SET, { value: 'No, I do not have a disability', label: 'No' }, { value: 'Yes, I have a disability', label: 'Yes' }, DECLINE] },
    ],
  },
];

function Labeled({ label, children, wide, from }: { label: string; children: ReactNode; wide?: boolean; from?: 'resume' | 'profile' }) {
  return (
    <label className={wide ? 'sm:col-span-2' : undefined}>
      <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted">
        {label}
        {from && <span className="rounded-full bg-accent-2/10 px-1.5 text-[10px] font-medium text-accent-2" title="Wera filled this in; save to keep it">from your {from}</span>}
      </span>
      {children}
    </label>
  );
}

const monthYear = (d?: string) => {
  if (!d) return '';
  const [y, m] = d.split('-');
  return m ? new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' }) : y;
};

/** The jobs and schools Wera reads from the resume, as it fills them into forms' Work Experience and Education blocks. */
function FromResume({ jobs, schools }: { jobs: ResumeJob[]; schools: ResumeSchool[] }) {
  if (!jobs.length && !schools.length) {
    return (
      <p className="rounded-lg border border-border bg-surface-2/40 p-3 text-xs text-muted">
        No jobs or schools yet. <Link to="/profile/resume" className="text-accent hover:underline">Create your resume</Link> and Wera fills forms' work experience and education from it.
      </p>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <h4 className="mb-1.5 text-xs font-semibold text-muted">Work experience</h4>
        <ul className="space-y-1.5">
          {jobs.map((j, i) => (
            <li key={i} className="rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-xs">
              <p className="font-medium text-text">{j.title || 'Untitled role'}{j.company ? `, ${j.company}` : ''}</p>
              <p className="text-faint">{[monthYear(j.start), j.current ? 'Present' : monthYear(j.end)].filter(Boolean).join(' – ')}{j.location ? ` · ${j.location}` : ''}</p>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="mb-1.5 text-xs font-semibold text-muted">Education</h4>
        <ul className="space-y-1.5">
          {schools.map((s, i) => (
            <li key={i} className="rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-xs">
              <p className="font-medium text-text">{s.school}</p>
              <p className="text-faint">{[s.degree, s.major].filter(Boolean).join(', ')}{s.end ? ` · ${monthYear(s.end)}` : ''}{s.gpa ? ` · GPA ${s.gpa}` : ''}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Where these details and the profile disagree (sponsorship, title,
 * experience): the person says which is right, and the other follows.
 * Until then the details win in applications and the profile in matching.
 */
function Conflicts() {
  const q = useDetailsConflicts();
  const resolve = useResolveConflict();
  const list = q.data?.conflicts ?? [];
  if (!list.length) return null;
  const settle = (key: string, keep: 'details' | 'profile', redraft: boolean) =>
    resolve.mutate({ key, keep }, {
      onSuccess: () => toast.success(keep === 'details' && redraft ? 'Saved. Redraft your profile text so it says the same.' : 'Saved.'),
      onError: (e) => toast.error(errorMessage(e, 'Could not save that')),
    });
  return (
    <section aria-labelledby="conflicts-title" className="rounded-xl border border-warn/40 bg-warn/5 p-4">
      <h3 id="conflicts-title" className="flex items-center gap-2 text-sm font-semibold text-text">
        <AlertTriangle className="size-4 text-warn" /> Your profile and these details disagree
      </h3>
      <p className="mt-1 max-w-xl text-xs text-muted">
        Applications use these details, and matching uses your profile. Pick which is right and the other is updated to match.
      </p>
      <ul className="mt-3 divide-y divide-border">
        {list.map((c) => (
          <li key={c.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
            <span className="min-w-40 flex-1 text-sm font-medium text-text">{c.label}</span>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={resolve.isPending} onClick={() => settle(c.key, 'details', c.redraft)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-left text-xs hover:border-accent/50 disabled:opacity-60">
                <span className="block text-[11px] text-faint">These details</span>{' '}
                <span className="font-medium text-text">{c.details}</span>
              </button>
              <button type="button" disabled={resolve.isPending} onClick={() => settle(c.key, 'profile', c.redraft)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-left text-xs hover:border-accent/50 disabled:opacity-60">
                <span className="block text-[11px] text-faint">Your profile</span>{' '}
                <span className="font-medium text-text">{c.elsewhere}</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The details the Chrome extension fills into application forms. Saved
 * separately from the profile (which only the matching uses).
 */
export function ApplicationDetails() {
  const q = useApplicant();
  const save = useSaveApplicant();
  const suggest = useSuggestApplicant();
  const [draft, setDraft] = useState<Applicant | null>(null);
  const [loadedFrom, setLoadedFrom] = useState<typeof q.data>(undefined);
  // Edits not saved yet: what the user typed differs from what is saved.
  const dirty = !!draft && !!loadedFrom && (Object.keys(draft) as Key[]).some((k) => (draft[k] ?? '') !== (loadedFrom.applicant[k] ?? ''));
  // Load what is saved (again after each save), but never over edits in progress:
  // a refetch in the background must not wipe what the user is typing.
  if (q.data && q.data !== loadedFrom && !dirty) {
    setLoadedFrom(q.data);
    setDraft(q.data.applicant);
  }
  useUnsavedGuard(dirty);
  // Arriving from the extension's "Edit your application details" link.
  const top = useRef<HTMLDivElement>(null);
  const ready = draft != null;
  useEffect(() => {
    // The section's own wrapper keeps clear of the page header (scroll-mt): scroll to it, not to this form.
    if (ready && window.location.hash === '#application') (document.getElementById('application') ?? top.current)?.scrollIntoView({ block: 'start' });
  }, [ready]);
  if (!draft) return <Skeleton className="h-64 w-full" />;

  const set = (k: Key, v: string) => setDraft({ ...draft, [k]: v });
  const fromResume = () =>
    suggest.mutate(undefined, {
      onSuccess: ({ suggestions }) => {
        // Only fill blanks: never overwrite what the user typed.
        const next = { ...draft };
        let n = 0;
        for (const [k, v] of Object.entries(suggestions) as [Key, string][]) {
          if (v && k in next && !next[k]) {
            next[k] = v;
            n++;
          }
        }
        setDraft(next);
        toast.success(n ? `Filled ${n} field${n === 1 ? '' : 's'} from your resume. Review, then save.` : 'Nothing new found in your resume.');
      },
      onError: (e) => toast.error(errorMessage(e, 'Could not read your resume')),
    });

  return (
    <div ref={top} className="space-y-5">
      <Conflicts />
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto max-w-xl text-xs text-muted">
          The Wera Chrome extension fills these into application forms. It never submits; you review every form.
          {' Blanks are filled from your profile and resume (marked "from your resume"); save to keep or change them.'}
        </p>
        <button type="button" onClick={fromResume} disabled={suggest.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text hover:border-accent/40 disabled:opacity-60">
          {suggest.isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} Fill blanks from my resume
        </button>
      </div>
      {GROUPS.map((g) => (
        <fieldset key={g.title}>
          <legend className="text-sm font-semibold text-text">{g.title}</legend>
          {g.hint && <p className="mt-0.5 text-xs text-faint">{g.hint}</p>}
          <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
            {g.fields.map((f) => (
              <Labeled key={f.key} label={f.label} wide={f.wide} from={draft[f.key] && draft[f.key] === q.data?.applicant[f.key] ? q.data?.sources?.[f.key] : undefined}>
                {f.options ? (
                  <select className={INPUT_CLS} value={draft[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} aria-label={f.label}>
                    {!f.options.some((o) => o.value === (draft[f.key] ?? '')) && draft[f.key] && <option value={draft[f.key]}>{draft[f.key]}</option>}
                    {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input className={INPUT_CLS} value={draft[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} aria-label={f.label} />
                )}
              </Labeled>
            ))}
          </div>
        </fieldset>
      ))}
      <fieldset>
        <legend className="text-sm font-semibold text-text">From your resume</legend>
        <p className="mt-0.5 text-xs text-faint">Forms that ask for each job or school (Workday, iCIMS and others) get these, most recent first. Change them by editing your resume.</p>
        <div className="mt-2.5"><FromResume jobs={q.data?.experience ?? []} schools={q.data?.education ?? []} /></div>
      </fieldset>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {save.error ? <span className="text-xs text-bad">{errorMessage(save.error, 'Save failed')}</span>
          : dirty && <span className="mr-auto text-xs text-warn" role="status">Application details have unsaved changes.</span>}
        {dirty && (
          <button type="button" onClick={() => { setDraft(loadedFrom.applicant); save.reset(); }} className="rounded-lg px-3 py-2 text-xs text-muted hover:text-text">
            Discard
          </button>
        )}
        <button type="button" disabled={save.isPending}
          onClick={() => save.mutate(draft, {
            onSuccess: () => {
              // What was sent is what is saved now: the form is clean until the saved copy arrives.
              setLoadedFrom((l) => (l ? { ...l, applicant: draft } : l));
              toast.success('Application details saved.');
            },
          })}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg hover:bg-accent/85 disabled:opacity-60">
          {save.isPending && <LoaderCircle className="size-4 animate-spin" />} Save details
        </button>
      </div>
    </div>
  );
}
