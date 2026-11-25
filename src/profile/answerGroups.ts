// Topic grouping and duplicate-answer folding for SavedAnswers.tsx.
import type { SavedAnswer } from '../api/extension';

export type TopicId = 'work_auth' | 'compensation' | 'location' | 'source' | 'compliance' | 'education' | 'other';

export const TOPICS: { id: Exclude<TopicId, 'other'>; label: string; pattern: RegExp }[] = [
  {
    id: 'work_auth',
    label: 'Work authorization & visas',
    pattern: /sponsor|authori[sz]ed|visa|citizen|clearance/i,
  },
  {
    id: 'compensation',
    label: 'Compensation & availability',
    pattern: /salary|compensation|pay expectation|notice|start date|when can you start|shift|weekend|overtime|full[- ]time|part[- ]time/i,
  },
  {
    id: 'location',
    label: 'Location & work mode',
    pattern: /relocat|travel|on-?site|in[- ]office|hybrid|remote|commut/i,
  },
  {
    id: 'source',
    label: 'Source & referrals',
    pattern: /hear about|referr/i,
  },
  {
    id: 'compliance',
    label: 'Background & compliance',
    pattern: /non-?compete|relative|family|related to|previously (worked|employed|applied)|worked (for|at) .* before|background check|drug|18 years|criminal|convict|felony|pronoun/i,
  },
  {
    id: 'education',
    label: 'Education & languages',
    pattern: /degree|graduat|languages?/i,
  },
];

// What the extension learned before it knew better (it no longer keeps these, see the extension's
// learn.ts): an option's text taken for a question, a field of a job or skill row, a box's label.
const NOT_A_QUESTION = /^(yes|no|opt[- ]?in|opt[- ]?out|i agree|agree|true|false)( required)?$|^(start|end|from|to) date$|^(position|job) title$|^current (position|job|role)$|^(company|employer)( name)?$|^overall$|^skill(set| level)?$|^length of use|^(comments?|please specify|other|notes?)$/i;

/** Classifies a saved answer into a common topic bucket, or 'other' for form-specific/one-off questions. */
export function topicOf(a: Pick<SavedAnswer, 'question'>): TopicId {
  const q = a.question.replace(/[\s*:?.]+$/, '').trim();
  if (NOT_A_QUESTION.test(q) || !/\p{L}{3}/u.test(q)) return 'other';
  for (const t of TOPICS) {
    if (t.pattern.test(q)) return t.id;
  }
  return 'other';
}

/** A question most forms ask in some wording (how did you hear, notice, relocation...). */
export function isCommon(a: Pick<SavedAnswer, 'question'>): boolean {
  return topicOf(a) !== 'other';
}

export interface AnswerCluster {
  key: string;
  primary: SavedAnswer;
  variants: SavedAnswer[];
  totalUses: number;
}

/**
 * Folds near-duplicate questions within a topic that share the exact same normalized answer
 * into a single representative row, sorted by total usage descending.
 */
export function clusterByAnswer(items: SavedAnswer[]): AnswerCluster[] {
  const groups = new Map<string, SavedAnswer[]>();
  for (const item of items) {
    const norm = item.answer.trim().toLowerCase().replace(/\s+/g, ' ');
    const key = norm.length > 0 && norm.length <= 120 ? norm : `id:${item.id}`;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .map(([key, list]) => {
      const sorted = [...list].sort((a, b) => b.uses - a.uses || b.updated_at.localeCompare(a.updated_at));
      return {
        key,
        primary: sorted[0],
        variants: sorted,
        totalUses: sorted.reduce((sum, x) => sum + Math.max(1, x.uses), 0),
      };
    })
    .sort((a, b) => b.totalUses - a.totalUses);
}
