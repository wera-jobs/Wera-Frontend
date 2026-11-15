// What to practice next in a role, picked so the page opens with one clear action.
import type { DomainStat, Practice, ScenarioCard, Track } from '../../api/interview';

/** What to do next, picked for the user, so the page opens with one clear action. */
export type Next =
  | { kind: 'sim'; sim: ScenarioCard }
  | { kind: 'missed'; count: number }
  | { kind: 'topic'; domain: DomainStat }
  | { kind: 'start-sim'; sim: ScenarioCard };

/**
 * The one thing worth doing next in a role: a simulation left halfway, then
 * the questions last answered wrong, then the topic with the most left to
 * learn (fewest answered, then fewest right), then a simulation not yet run.
 */
export function upNext(track: Track, domains: DomainStat[], sims: ScenarioCard[], practice?: Practice): Next | null {
  const mine = track.scenarios.map((id) => sims.find((s) => s.id === id)).filter((s): s is ScenarioCard => !!s);
  const going = mine.find((s) => s.progress.answered > 0 && s.progress.answered < s.steps);
  if (going) return { kind: 'sim', sim: going };
  if ((practice?.missed ?? 0) > 0) return { kind: 'missed', count: practice!.missed };
  const open = track.domains
    .map((d) => domains.find((x) => x.domain === d))
    .filter((d): d is DomainStat => !!d && d.answered < d.questions);
  const share = (d: DomainStat) => d.answered / Math.max(d.questions, 1);
  const right = (d: DomainStat) => (d.answered ? d.correct / d.answered : 0);
  const topic = [...open].sort((a, b) => share(a) - share(b) || right(a) - right(b))[0];
  if (topic) return { kind: 'topic', domain: topic };
  const fresh = mine.find((s) => s.progress.best < 0);
  return fresh ? { kind: 'start-sim', sim: fresh } : null;
}
