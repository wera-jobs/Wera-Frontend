import { ImportApplications } from '../components/ImportApplications';
import { useState, type FormEvent, type ReactNode } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { Bell, Check, Copy, Download, EyeOff, Info, KeyRound, LoaderCircle, MailCheck, Palette, Puzzle, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { useConnections, useDisconnect } from '../api/extension';
import { useExtension } from '../lib/extension';
import { relTime } from '../lib/format';
import { sendVerification, useAuthConfig, useChangePassword, useDeleteAccount, useMe } from '../api/auth';
import { api, errorMessage, errorOrNull } from '../api/client';
import { useHealth, useHideCompany, useIndustryLabel, useSaveSettings, useSettings } from '../api/hooks';
import type { AppStatus, Job, JobList, Settings } from '../api/types';
import { Field } from '../components/Field';
import { INPUT_CLS } from '../lib/styles';
import { ErrorState, Skeleton } from '../components/States';
import { Switch } from '../components/Switch';
import { ThemeChoice } from '../lib/theme';
import { toast } from '../lib/toast';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useActiveSection } from '../lib/useActiveSection';
import { readWeeklyGoal, writeWeeklyGoal } from '../lib/goals';

function Section({ id, icon: Icon, title, hint, children, tone }: {
  id?: string; icon: typeof Bell; title: string; hint?: string; children: ReactNode; tone?: 'danger';
}) {
  return (
    <section id={id} className={clsx('scroll-mt-20 rounded-card border bg-surface p-5', tone === 'danger' ? 'border-bad/30' : 'border-border')}>
      <div className="mb-4 flex items-start gap-3">
        <span className={clsx('mt-0.5 rounded-lg p-1.5', tone === 'danger' ? 'bg-bad/10 text-bad' : 'bg-surface-2 text-muted')}>
          <Icon className="size-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-text">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
        </div>
      </div>
      <div className="space-y-4 pl-0 sm:pl-10">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm text-text">{label}</div>
        {hint && <div className="text-xs text-faint">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

/** The weekly application goal: typed, saved on Enter or leaving the box; 0 or empty turns it off. */
function GoalInput({ value, onSave }: { value: number; onSave: (n: number) => void }) {
  const [text, setText] = useState(value ? String(value) : '');
  const [synced, setSynced] = useState(value);
  // A change from elsewhere (Today's goal editor) shows here too.
  if (value !== synced) {
    setSynced(value);
    setText(value ? String(value) : '');
  }
  const commit = () => {
    const n = Math.max(0, Math.min(100, Math.round(Number(text) || 0)));
    setText(n ? String(n) : '');
    if (n !== value) onSave(n);
  };
  return (
    <label className="inline-flex items-center gap-2 text-xs text-muted">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={100}
        value={text}
        placeholder="Off"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        aria-label="Applications per week"
        className={`${INPUT_CLS} w-20 text-right tabular-nums`}
      />
      a week
    </label>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200',
            value === o.value ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PasswordForm() {
  const change = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    change.mutate(
      { current_password: current, new_password: next },
      {
        onSuccess: () => {
          setCurrent('');
          setNext('');
          toast.success('Password changed. Your other sessions were signed out.');
        },
      },
    );
  };
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <Field label="Current password">
        <input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" className={INPUT_CLS} />
      </Field>
      <Field label="New password">
        <input type="password" required minLength={10} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" className={INPUT_CLS} />
      </Field>
      <button type="submit" disabled={change.isPending} className="h-9 rounded-lg border border-border bg-surface-2 px-3 text-xs font-medium text-text hover:border-accent/40 disabled:opacity-60">
        Update
      </button>
      {change.error && <p className="text-xs text-bad sm:col-span-3">{errorOrNull(change.error)}</p>}
    </form>
  );
}

/** Downloads every job with an application status as CSV. */
const TRACKED: AppStatus[] = ['saved', 'applied', 'interviewing', 'offer', 'rejected', 'not_interested'];
const EXPORT_PAGE = 200;

/** Every job the user tracks, a status and a page at a time. */
async function trackedJobs(): Promise<Job[]> {
  const out: Job[] = [];
  for (const status of TRACKED) {
    for (let offset = 0; ; offset += EXPORT_PAGE) {
      const { jobs } = await api<JobList>(`/api/jobs?status=${status}&limit=${EXPORT_PAGE}&offset=${offset}`);
      out.push(...jobs);
      if (jobs.length < EXPORT_PAGE) break;
    }
  }
  return out;
}

/** A CSV cell. A leading quote keeps a spreadsheet from running a job title as a formula. */
function csvCell(v: string | number | null | undefined): string {
  const s = String(v ?? '');
  return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
}

async function exportApplications() {
  try {
    const rows = await trackedJobs();
    const csv = [
      ['company', 'title', 'status', 'fit_score', 'location', 'url', 'notes', 'posting_closed'].join(','),
      ...rows.map((j) =>
        [j.company, j.title, j.application_status, j.fit_score, j.location_summary ?? j.location_raw, j.url, j.application_notes, j.closed_at?.slice(0, 10)]
          .map(csvCell)
          .join(','),
      ),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'wera-applications.csv' });
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} application${rows.length === 1 ? '' : 's'}.`);
  } catch (e) {
    toast.error(`Couldn't export: ${errorMessage(e)}`);
  }
}

function Connections() {
  const q = useConnections();
  const disconnect = useDisconnect();
  const version = useExtension();
  const list = q.data?.connections ?? [];
  return (
    <div>
      {version && (
        <p className="mb-2 text-xs text-good">
          Installed in this browser (v{version}). Opening a posting from Wera tells it which job you are applying to.
        </p>
      )}
      {list.length === 0 ? (
        <p className="text-xs text-faint">No browser connected. Install the Wera extension, open it on any job page and sign in.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {list.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="truncate text-text">{c.name}</div>
                <div className="text-xs text-faint">
                  Connected {relTime(c.created_at)} · {c.last_used_at ? `last used ${relTime(c.last_used_at)}` : 'not used yet'}
                </div>
              </div>
              <button onClick={() => disconnect.mutate(c.id, { onSuccess: () => toast.success(`${c.name} disconnected.`), onError: (e: unknown) => toast.error(errorMessage(e)) })}
                className="shrink-0 text-xs font-medium text-bad hover:underline">
                Disconnect
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-faint">
        Changing your password disconnects every browser. What it fills comes from your{' '}
        <Link to="/profile#application" className="text-accent-2 underline decoration-current/40 underline-offset-2 hover:decoration-current">application details</Link> and{' '}
        <Link to="/profile#answers" className="text-accent-2 underline decoration-current/40 underline-offset-2 hover:decoration-current">saved answers</Link>.
      </p>
    </div>
  );
}

function EmailStatus({ verified }: { verified: boolean }) {
  const [state, setState] = useState<'' | 'sending' | 'sent'>('');
  const send = () => {
    setState('sending');
    sendVerification()
      .then(() => setState('sent'))
      .catch((e) => { setState(''); toast.error(errorMessage(e, 'Could not send the link')); });
  };
  return (
    <Row label="Email address" hint={verified ? 'Confirmed.' : 'Not confirmed yet: confirm it to get digests and password resets.'}>
      {verified ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-good"><MailCheck className="size-3.5" /> Confirmed</span>
      ) : state === 'sent' ? (
        <span className="text-xs text-muted">Link sent. Check your inbox.</span>
      ) : (
        <button onClick={send} disabled={state === 'sending'} className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium hover:border-accent/40 disabled:opacity-60">
          Send confirmation link
        </button>
      )}
    </Row>
  );
}

function DeleteAccount() {
  const del = useDeleteAccount();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  if (!open) {
    return (
      <Row label="Delete account" hint="Removes your profile, matches, tracker, letters and files. This cannot be undone.">
        <button onClick={() => setOpen(true)} className="rounded-lg border border-bad/40 px-3 py-1.5 text-xs font-medium text-bad hover:bg-bad/10">
          Delete account…
        </button>
      </Row>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // A full page load: nothing of the deleted account stays in memory.
        del.mutate(password, { onSuccess: () => window.location.replace('/signup') });
      }}
      className="space-y-3 rounded-lg border border-bad/30 bg-bad/5 p-4"
    >
      <p className="text-sm text-text">Enter your password to permanently delete your account.</p>
      <input type="password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={INPUT_CLS} />
      {del.error && <p className="text-xs text-bad">{errorOrNull(del.error)}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={del.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-bad px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
          {del.isPending && <LoaderCircle className="size-3.5 animate-spin" />} Delete forever
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-xs text-muted hover:text-text">
          Cancel
        </button>
      </div>
    </form>
  );
}

/** What is running, for bug reports: the dashboard and the server, with their commits. */
function About() {
  const health = useHealth();
  const [copied, setCopied] = useState(false);
  const web = `v${__APP_VERSION__}`;
  const server = health.data ? health.data.version.replace(/^(\d)/, 'v$1') : health.isError ? 'Unreachable' : 'Checking…';
  const info = `Wera dashboard ${web} (${__APP_COMMIT__}) · server ${server}${health.data?.commit ? ` (${health.data.commit})` : ''} · ${navigator.userAgent}`;
  const copy = () => {
    void navigator.clipboard?.writeText(info).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }, () => toast.error('Could not copy. Select the versions above instead.'));
  };
  return (
    <>
      <Row label="Dashboard"><span className="font-mono text-xs text-muted" title={`commit ${__APP_COMMIT__}`}>{web}</span></Row>
      <Row label="Server">
        <span className={clsx('inline-flex items-center gap-1.5 font-mono text-xs', health.isError ? 'text-bad' : 'text-muted')} title={health.data?.commit ? `commit ${health.data.commit}` : undefined}>
          <span aria-hidden className={clsx('size-1.5 rounded-full', health.data ? 'bg-good' : health.isError ? 'bg-bad' : 'bg-warn')} />
          {server}
        </span>
      </Row>
      <Row label="Version details" hint="Paste these into a bug report so we know exactly what you were running.">
        <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text hover:border-accent/40">
          {copied ? <Check className="size-3.5 text-good" /> : <Copy className="size-3.5" />} {copied ? 'Copied' : 'Copy'}
        </button>
      </Row>
    </>
  );
}

const SETTINGS_SECTIONS = [
  ['appearance', 'Appearance'],
  ['feed', 'Job feed'],
  ['notifications', 'Notifications'],
  ['extension', 'Extension'],
  ['account', 'Account & data'],
] as const;
const SETTINGS_IDS = SETTINGS_SECTIONS.map(([id]) => id);

export default function SettingsPage() {
  useDocumentTitle('Settings');
  const me = useMe();
  const mailEnabled = useAuthConfig().data?.mail_enabled ?? false;
  const settings = useSettings();
  const save = useSaveSettings();
  const hide = useHideCompany();
  const industryLabel = useIndustryLabel();
  const [draft, setDraft] = useState<Settings | null>(null);
  const activeSection = useActiveSection(SETTINGS_IDS, draft != null);

  if (settings.data && !draft) {
    const { hidden_companies: _hidden, ...rest } = settings.data;
    setDraft(rest);
  }

  if (settings.isLoading) return <Skeleton className="h-96 w-full" />;
  if (!draft) return <ErrorState message={errorMessage(settings.error)} onRetry={() => void settings.refetch()} />;

  const update = (next: Settings) => {
    const prev = draft;
    setDraft(next);
    save.mutate(next, {
      onError: (e) => {
        // Put the switch back, unless the user has changed something since.
        setDraft((cur) => (cur === next ? prev : cur));
        toast.error(`Couldn't save: ${errorOrNull(e)}`);
      },
    });
  };
  const n = draft.notifications;
  const setN = (patch: Partial<Settings['notifications']>) => update({ ...draft, notifications: { ...n, ...patch } });
  const hidden = settings.data?.hidden_companies ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      <header>
        <h1 className="text-[28px] leading-tight font-semibold">Settings</h1>
        <p className="mt-1 text-xs text-muted">Changes save as you make them.</p>
      </header>

      <nav aria-label="Settings sections" className="sticky top-14 z-20 -mx-1 flex flex-wrap gap-1.5 bg-bg/90 px-1 py-2 backdrop-blur">
        {SETTINGS_SECTIONS.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            aria-current={activeSection === id ? 'location' : undefined}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
              window.history.replaceState(window.history.state, '', `#${id}`);
            }}
            className={clsx(
              'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              activeSection === id ? 'border-accent/50 bg-accent/10 text-accent' : 'border-border bg-surface text-muted hover:border-accent/40 hover:text-text',
            )}
          >
            {label}
          </a>
        ))}
      </nav>

      <Section id="appearance" icon={Palette} title="Appearance">
        <Row label="Theme" hint="Match system follows your device's light or dark setting.">
          <ThemeChoice />
        </Row>
      </Section>

      <Section id="feed" icon={SlidersHorizontal} title="Job feed">
        <Row label="Sort jobs by" hint="The default order on the Jobs page.">
          <Segmented
            label="Default sort"
            value={draft.default_sort}
            onChange={(v) => update({ ...draft, default_sort: v })}
            options={[
              { value: 'score', label: 'Best fit' },
              { value: 'newest', label: 'Newest' },
            ]}
          />
        </Row>
        <Row label="Weekly application goal" hint="Today and the weekly review show how far along the week is, and your streak of weeks that met it.">
          <GoalInput
            value={draft.weekly_application_goal ?? readWeeklyGoal()}
            onSave={(n) => {
              writeWeeklyGoal(n);
              update({ ...draft, weekly_application_goal: n });
            }}
          />
        </Row>
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-text">
            <EyeOff className="size-3.5 text-faint" /> Hidden companies
          </div>
          {hidden.length === 0 ? (
            <p className="text-xs text-faint">None. Hide a company from any job's detail view; its jobs disappear and are never scored.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {hidden.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>
                    {c.name} <span className="text-xs text-faint">· {industryLabel(c.industry)}</span>
                  </span>
                  <button onClick={() => hide.mutate({ id: c.id, hidden: false }, { onError: (e: unknown) => toast.error(errorMessage(e)) })} className="text-xs font-medium text-accent hover:underline">
                    Unhide
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <Section id="notifications" icon={Bell} title="Notifications" hint={mailEnabled ? 'Sent to ' + (me.data?.email ?? 'your address') + '.' : 'Email notifications are coming soon. Your choices are saved now and will apply when they launch.'}>
        <Row label="Match digest" hint="A summary of your best new matches.">
          <Switch label="Match digest" checked={n.email_digest} onChange={(v) => setN({ email_digest: v })} />
        </Row>
        <Row label="Digest frequency">
          <Segmented
            label="Digest frequency"
            value={n.frequency}
            onChange={(v) => setN({ frequency: v })}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
            ]}
          />
        </Row>
        <Row label="Strong match alerts" hint="A note in the bell when new jobs score at or above your bar.">
          <Switch label="Strong match alerts" checked={n.strong_matches} onChange={(v) => setN({ strong_matches: v })} />
        </Row>
        <Row label="Strong match score" hint="The fit score that counts as strong.">
          <select
            aria-label="Strong match score"
            value={n.min_score}
            disabled={!n.strong_matches}
            onChange={(e) => setN({ min_score: Number(e.target.value) })}
            className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text disabled:opacity-50"
          >
            {/* A bar set elsewhere (the API takes 50 to 100) stays on the list. */}
            {[...new Set([60, 65, 70, 75, 80, 85, 90, 95, n.min_score])].sort((x, y) => x - y).map((v) => (
              <option key={v} value={v}>
                {v}+
              </option>
            ))}
          </select>
        </Row>
        <Row label="Product updates" hint="Occasional news about new Wera features.">
          <Switch label="Product updates" checked={n.product_updates} onChange={(v) => setN({ product_updates: v })} />
        </Row>
      </Section>

      <Section id="extension" icon={Puzzle} title="Chrome extension" hint="Save jobs, write cover letters, tailor your resume and fill applications from any job site: it lists every field, fills what you approve and continues page by page. It never submits.">
        <Connections />
      </Section>

      <Section id="account" icon={KeyRound} title="Account" hint={me.data?.email}>
        {mailEnabled && <EmailStatus verified={me.data?.email_verified ?? false} />}
        <PasswordForm />
        <Row label="Export applications" hint="Every job you saved, applied to or tracked, as CSV.">
          <button onClick={() => void exportApplications()} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text hover:border-accent/40">
            <Download className="size-3.5" /> Download CSV
          </button>
        </Row>
        <Row label="Import applications" hint="Jobs you track in a spreadsheet or another tracker, from a CSV: company, title, link and status at least.">
          <ImportApplications />
        </Row>
      </Section>

      <Section icon={Info} title="About">
        <About />
      </Section>

      <Section icon={ShieldAlert} title="Danger zone" tone="danger">
        <DeleteAccount />
      </Section>
    </div>
  );
}
