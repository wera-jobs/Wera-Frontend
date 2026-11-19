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
