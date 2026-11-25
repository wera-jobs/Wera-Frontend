import { useState } from 'react';
import { CalendarCheck, ExternalLink, Mail, Plus, Trash2, UserPlus } from 'lucide-react';
import { errorMessage } from '../api/client';
import { useAddJobContact, useDeleteJobContact, useJobContacts, usePatchJobContact } from '../api/crm';
import { relTime } from '../lib/format';
import { toast } from '../lib/toast';

const INPUT =
  'w-full rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-text placeholder:text-faint hover:border-accent/40 focus:border-accent/60 focus:outline-none';

/** Per-application Contacts CRM list with follow-up tracking. */
export function JobContacts({ jobId }: { jobId: number }) {
  const q = useJobContacts(jobId);
  const add = useAddJobContact(jobId);
  const patch = usePatchJobContact(jobId);
  const del = useDeleteJobContact(jobId);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [followUp, setFollowUp] = useState('');

  const contacts = q.data?.contacts ?? [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    add.mutate(
      {
        name: name.trim(),
        role: role.trim() || undefined,
        email: email.trim() || undefined,
        linkedin_url: linkedin.trim() || undefined,
        follow_up_at: followUp ? new Date(`${followUp}T09:00`).toISOString() : undefined,
      },
      {
        onSuccess: () => {
          setName('');
          setRole('');
          setEmail('');
          setLinkedin('');
          setFollowUp('');
          setAdding(false);
          toast.success('Contact saved.');
        },
        onError: (err) => toast.error(errorMessage(err, 'Could not save contact')),
      },
    );
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] text-muted">People &amp; follow-ups ({contacts.length})</span>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
          >
            <UserPlus className="size-3" /> Add person
          </button>
        )}
      </div>

      {contacts.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {contacts.map((c) => (
            <li key={c.id} className="rounded-lg border border-border bg-surface-2/50 p-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-text">
                    {c.name}
                    {c.role && <span className="ml-1.5 font-normal text-muted">· {c.role}</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 text-accent hover:underline">
                        <Mail className="size-3" /> {c.email}
                      </a>
                    )}
                    {c.linkedin_url && (
                      <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                        LinkedIn <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    title="Log that you contacted them today"
                    onClick={() =>
                      patch.mutate(
                        { cid: c.id, last_contacted_at: new Date().toISOString() },
                        { onSuccess: () => toast.success(`Logged follow-up with ${c.name}.`) },
                      )
                    }
                    className="rounded p-1 text-faint hover:text-good"
                    aria-label={`Log contact with ${c.name}`}
                  >
                    <CalendarCheck className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => del.mutate(c.id)}
                    className="rounded p-1 text-faint hover:text-bad"
                    aria-label={`Remove ${c.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              {(c.last_contacted_at || c.follow_up_at) && (
                <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-faint">
                  {c.last_contacted_at && <span>Last spoke {relTime(c.last_contacted_at)}</span>}
                  {c.follow_up_at && <span>· Follow up {new Date(c.follow_up_at).toLocaleDateString()}</span>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <form onSubmit={submit} className="space-y-2 rounded-lg border border-border bg-surface-2/40 p-2.5">
          <div className="grid grid-cols-2 gap-1.5">
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Person name" className={INPUT} />
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Recruiter, HM, alum…" aria-label="Person role" className={INPUT} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Person email" className={INPUT} />
            <input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} aria-label="Follow-up date" className={INPUT} />
            <input type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="LinkedIn URL" aria-label="Person LinkedIn URL" className={`${INPUT} col-span-2`} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} className="px-2 py-1 text-xs text-muted hover:text-text">Cancel</button>
            <button type="submit" disabled={add.isPending || !name.trim()} className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-bg hover:bg-accent/85 disabled:opacity-50">
              <Plus className="size-3" /> Save person
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
