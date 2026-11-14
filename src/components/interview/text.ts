// Words and colors the interview views share.
import { CheckCircle2, CircleDot, XCircle } from 'lucide-react';
import type { Rating } from '../../api/interview';

export const RATING: Record<Rating, { label: string; cls: string; ring: string; Icon: typeof CheckCircle2 }> = {
  best: { label: 'Best reply', cls: 'text-good bg-good/10', ring: 'border-good/50 bg-good/5', Icon: CheckCircle2 },
  okay: { label: 'Okay', cls: 'text-warn bg-warn/10', ring: 'border-warn/40 bg-warn/5', Icon: CircleDot },
  weak: { label: 'Weak', cls: 'text-bad bg-bad/10', ring: 'border-bad/40 bg-bad/5', Icon: XCircle },
};

export function verdict(points: number, max: number) {
  const pct = max ? points / max : 0;
  if (pct >= 0.85) return 'Strong judgment. This is how the best candidates answer.';
  if (pct >= 0.6) return 'Solid. Read the okay replies again: each is missing one piece.';
  return 'Worth another run. The feedback on each reply is where the learning is.';
}

/** Stack tags as people write them. */
const TAG_LABELS: Record<string, string> = {
  javascript: 'JavaScript', typescript: 'TypeScript', react: 'React', css: 'CSS', html: 'HTML', go: 'Go', python: 'Python',
  java: 'Java', sql: 'SQL', postgres: 'Postgres', docker: 'Docker', kubernetes: 'Kubernetes', terraform: 'Terraform',
  aws: 'AWS', linux: 'Linux', ios: 'iOS', android: 'Android', swift: 'Swift', kotlin: 'Kotlin', http: 'HTTP', sre: 'SRE',
  'least-privilege': 'Least privilege', ml: 'ML',
};

export function tagLabel(tag: string) {
  return TAG_LABELS[tag] ?? tag.charAt(0).toUpperCase() + tag.slice(1);
}

/**
 * What a key press means in a round or a simulation: the index of a reply
 * (A to D), 'next', or null. Shortcuts with Ctrl, Cmd or Alt are the
 * browser's (Ctrl+C copies the question, it does not pick C), a held key
 * does not answer the next question too, typing in a field is typing, and
 * Enter on a button or link is that control's own press.
 */
export function practiceKey(e: KeyboardEvent): number | 'next' | null {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return null;
  const t = e.target instanceof HTMLElement ? e.target : null;
  if (t?.closest('input, textarea, select, [contenteditable="true"]')) return null;
  if (e.key === 'ArrowRight') return 'next';
  if (e.key === 'Enter') return t?.closest('button, a') ? null : 'next';
  const n = e.key.length === 1 ? 'abcd'.indexOf(e.key.toLowerCase()) : -1;
  return n >= 0 ? n : null;
}
