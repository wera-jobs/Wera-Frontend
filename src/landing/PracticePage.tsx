// A practice application on Wera's own site (wera-extension#244): a form
// like the ones companies use, for trying the extension's Autofill. Nothing
// is sent anywhere: Submit only says so.
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { ThemeToggle } from '../lib/theme';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { usePublicPage } from '../lib/usePublicPage';
import { SiteFooter } from './SiteFooter';

const INPUT = 'mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-accent focus:outline-none';

function Field({ id, label, required, children, hint }: { id: string; label: string; required?: boolean; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-text">{label}{required && <span className="text-bad"> *</span>}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  );
}

function Choice({ id, label, required, options }: { id: string; label: string; required?: boolean; options: string[] }) {
  return (
    <Field id={id} label={label} required={required}>
      <select id={id} name={id} required={required} defaultValue="" className={INPUT}>
        <option value="" disabled>Select…</option>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </Field>
  );
}

export default function PracticePage() {
  useDocumentTitle('Practice application');
  usePublicPage('/practice', 'A practice job application for trying Wera\'s Autofill. Nothing you enter is sent.');
  const [done, setDone] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setDone(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return (
    <div className="flex min-h-svh flex-col bg-bg text-text">
      <header className="border-b border-border">
        <nav className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6" aria-label="Main">
          <Link to="/" aria-label="Wera home"><Logo /></Link>
          <div className="ml-auto flex items-center gap-2"><ThemeToggle /></div>
        </nav>
      </header>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-sm font-medium text-accent">Practice application</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Data Analyst at Example Co</h1>
        <p className="mt-3 text-pretty text-muted">
          A form like the ones companies use, for trying Wera. Press <strong className="text-text">Autofill</strong> in the Wera panel and watch it fill your
          details, attach your resume and draft the open question. Check what it lists under <strong className="text-text">Needs you</strong>, change anything in the
          form, then press Submit: nothing is sent anywhere.
        </p>
        {done && (
          <div role="status" className="mt-6 rounded-lg border border-good/40 bg-good/10 px-4 py-3 text-sm text-text">
            That's it. On a real application, this is where you would press Submit yourself. Nothing was sent.
            To change what Wera fills, edit <Link to="/profile" className="font-medium underline underline-offset-[3px]">your application details</Link>.
          </div>
        )}
        <form onSubmit={submit} className="mt-8 space-y-8" aria-label="Job application">
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold">Your details</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="first_name" label="First name" required><input id="first_name" name="first_name" autoComplete="given-name" required className={INPUT} /></Field>
              <Field id="last_name" label="Last name" required><input id="last_name" name="last_name" autoComplete="family-name" required className={INPUT} /></Field>
              <Field id="email" label="Email" required><input id="email" name="email" type="email" autoComplete="email" required className={INPUT} /></Field>
              <div className="grid grid-cols-[7rem_1fr] gap-2">
                <Choice id="phone_country" label="Country code" options={['+1 United States', '+44 United Kingdom', '+91 India', '+254 Kenya', '+49 Germany']} />
                <Field id="phone" label="Phone" required><input id="phone" name="phone" type="tel" autoComplete="tel-national" required className={INPUT} /></Field>
              </div>
              <Field id="location" label="Location (city)" required><input id="location" name="location" required className={INPUT} /></Field>
              <Field id="linkedin" label="LinkedIn profile"><input id="linkedin" name="linkedin" type="url" className={INPUT} /></Field>
            </div>
          </fieldset>
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold">Resume and cover letter</legend>
            <Field id="resume" label="Resume/CV" required hint="PDF or Word, up to 5 MB"><input id="resume" name="resume" type="file" accept=".pdf,.doc,.docx" required className="mt-1 block text-sm text-muted" /></Field>
            <Field id="cover_letter" label="Cover letter"><input id="cover_letter" name="cover_letter" type="file" accept=".pdf,.doc,.docx" className="mt-1 block text-sm text-muted" /></Field>
          </fieldset>
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold">Questions</legend>
            <Choice id="authorized" label="Are you legally authorized to work in the United States?" required options={['Yes', 'No']} />
            <Choice id="sponsorship" label="Will you now or in the future require visa sponsorship?" required options={['Yes', 'No']} />
            <Choice id="experience" label="Do you have at least 2 years of professional experience?" required options={['Yes', 'No']} />
            <Field id="why" label="Why do you want to work at Example Co?" required hint="A few sentences">
              <textarea id="why" name="why" rows={5} required className={INPUT} />
            </Field>
          </fieldset>
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold">Voluntary self-identification</legend>
            <p className="text-sm text-muted">Optional. Wera fills these only from what you set in your application details, and never sends them to the AI.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Choice id="gender" label="Gender" options={['Male', 'Female', 'Non-binary', 'I don\'t wish to answer']} />
              <Choice id="veteran" label="Veteran status" options={['I am not a veteran', 'I am a veteran, but not a protected veteran', 'I identify as one or more of the classifications of protected veteran', 'I don\'t wish to answer']} />
              <Choice id="disability" label="Disability status" options={['Yes, I have a disability', 'No, I do not have a disability', 'I do not want to answer']} />
            </div>
          </fieldset>
          <label className="flex items-start gap-2 text-sm text-muted">
            <input type="checkbox" name="consent" required className="mt-1" />
            I agree that Example Co may keep my application to consider me for this role. (Wera leaves consents like this one for you.)
          </label>
          <button type="submit" className="rounded-lg bg-text px-5 py-2.5 text-sm font-semibold text-bg hover:opacity-90">Submit application</button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
