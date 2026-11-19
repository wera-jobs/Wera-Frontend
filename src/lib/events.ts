// Labels and dates for an application's interviews and other dated steps.
import type { EventKind } from '../api/types';

export const EVENT_KINDS: [EventKind, string][] = [
  ['phone_screen', 'Phone screen'],
  ['interview', 'Interview'],
  ['onsite', 'Onsite'],
  ['assessment', 'Assessment due'],
  ['offer_call', 'Offer call'],
  ['other', 'Other'],
];
export const eventKindLabel = (k: EventKind) => EVENT_KINDS.find(([v]) => v === k)?.[1] ?? k;

/** "Tue, Dec 1, 3:00 PM" in the user's own time. */
export const whenText = (iso: string, withTime = true) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });

/** How the dashboard names each resume kind. */
export const RESUME_KINDS: [string, string][] = [
  ['tailored', 'Tailored for this job'],
  ['base', 'Main resume'],
  ['upload', 'Uploaded file'],
];

/** "Tailored for this job + letter", for the tracker. */
export function resumeText(r: { kind: string; letter: boolean } | null | undefined): string {
  if (!r || (!r.kind && !r.letter)) return '';
  const kind = RESUME_KINDS.find(([k]) => k === r.kind)?.[1] ?? '';
  return [kind, r.letter ? (kind ? '+ letter' : 'Cover letter') : ''].filter(Boolean).join(' ');
}
