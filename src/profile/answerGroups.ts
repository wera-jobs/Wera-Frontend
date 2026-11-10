// Which saved answers the profile shows first (see SavedAnswers.tsx).
import type { SavedAnswer } from '../api/extension';

// Questions most application forms ask in some wording.
const COMMON = /hear about|referr|salary|compensation|pay expectation|notice|start date|when can you start|relocat|travel|non-?compete|relative|family|related to|previously (worked|employed|applied)|worked (for|at) .* before|sponsor|authori[sz]ed|visa|on-?site|in[- ]office|hybrid|remote|commut|background check|drug|18 years|criminal|convict|felony|languages?|pronoun|citizen|clearance|shift|weekend|overtime|full[- ]time|part[- ]time|degree|graduat/i;

// What the extension learned before it knew better (it no longer keeps these, see the extension's
// learn.ts): an option's text taken for a question, a field of a job or skill row, a box's label.
const NOT_A_QUESTION = /^(yes|no|opt[- ]?in|opt[- ]?out|i agree|agree|true|false)( required)?$|^(start|end|from|to) date$|^(position|job) title$|^current (position|job|role)$|^(company|employer)( name)?$|^overall$|^skill(set| level)?$|^length of use|^(comments?|please specify|other|notes?)$/i;

/** A question most forms ask in some wording (how did you hear, notice, relocation...). A count of uses is no sign: a table's rows count many. */
export function isCommon(a: Pick<SavedAnswer, 'question'>): boolean {
  const q = a.question.replace(/[\s*:?.]+$/, '').trim();
  return COMMON.test(q) && !NOT_A_QUESTION.test(q) && /\p{L}{3}/u.test(q);
}
