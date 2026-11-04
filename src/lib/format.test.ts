import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  capitalize, compact, jobMeta, minutesUntil, money, pct, prettyReason, relTime, runDuration, shortLocation, stepId, toYou, verdictOf,
} from './format';

describe('verdictOf', () => {
  it.each([
    [null, 'poor'], [95, 'strong'], [80, 'strong'], [79, 'good'], [65, 'good'], [50, 'stretch'], [10, 'poor'],
  ] as const)('%s -> %s', (score, verdict) => expect(verdictOf(score)).toBe(verdict));
});

describe('time', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-10T12:00:00Z') }));
  afterEach(() => vi.useRealTimers());

  it('relTime', () => {
    expect(relTime(null)).toBe('—');
    expect(relTime('2026-10-10T12:05:00Z')).toBe('just now');
    expect(relTime('2026-10-10T11:45:00Z')).toBe('15m ago');
    expect(relTime('2026-10-10T09:00:00Z')).toBe('3h ago');
    expect(relTime('2026-10-07T12:00:00Z')).toBe('3d ago');
    expect(relTime('2026-06-10T12:00:00Z')).toBe('4mo ago');
  });

  it('minutesUntil', () => {
    expect(minutesUntil('2026-10-10T12:30:30Z')).toBe(30);
    expect(minutesUntil('2026-10-10T11:00:00Z')).toBeLessThan(0);
    expect(minutesUntil(null)).toBe(0);
  });
});

describe('numbers', () => {
  it('money', () => {
    expect(money(null)).toBe('—');
    expect(money(0)).toBe('$0');
    expect(money(0.000341)).toBe('$0.000341');
    expect(money(2.5)).toBe('$2.50');
    expect(money(1234.567)).toBe('$1,234.57');
  });
  it('compact', () => {
    expect(compact(712_300)).toBe('712.3k');
    expect(compact(1_200_000)).toBe('1.2M');
    expect(compact(2000)).toBe('2k');
    expect(compact(42)).toBe('42');
    expect(compact(Number.NaN)).toBe('—');
  });
  it('pct and runDuration', () => {
    expect(pct(88.66)).toBe('88.7%');
    expect(pct(undefined)).toBe('—');
    expect(runDuration('2026-10-10T12:00:00Z', null)).toBe('…');
    expect(runDuration('2026-10-10T12:00:00Z', '2026-10-10T12:00:02.4Z')).toBe('2.4s');
    expect(runDuration('2026-10-10T12:00:00Z', '2026-10-10T12:01:12Z')).toBe('1m 12s');
  });
});

describe('labels', () => {
  it('prettyReason', () => {
    expect(prettyReason('llm:years>3')).toBe('Needs more than 3 years');
    expect(prettyReason('location:non_us')).toBe('Non-US location');
    expect(prettyReason('title:engineering_manager')).toBe('Engineering manager title');
    expect(prettyReason('something:else')).toBe('something:else');
  });
  it('shortLocation', () => {
    expect(shortLocation({ location_summary: 'New York, NY; Austin, TX', location_raw: null })).toBe('New York, NY +1');
    expect(shortLocation({ location_summary: 'Remote (US only)', location_raw: null })).toBe('Remote');
    expect(shortLocation({ location_summary: null, location_raw: null })).toBe('—');
  });
  it('capitalize and stepId', () => {
    expect(capitalize('entry')).toBe('Entry');
    expect(stepId([4, 7, 9], 7, 1)).toBe(9);
    expect(stepId([4, 7, 9], 4, -1)).toBeNull();
    expect(stepId([4, 7, 9], 5, 1)).toBeNull();
  });
});

describe('toYou', () => {
  it.each([
    ["This mid-level MLE role matches the candidate's 3 years of experience.", 'This mid-level MLE role matches your 3 years of experience.'],
    ['Defense autonomy fits his interests, but it needs clearance.', 'Defense autonomy fits your interests, but it needs clearance.'],
    ['Candidate is a senior QA/SDET in software, and Costa Mesa onsite is unwanted.', 'You are a senior QA/SDET in software, and Costa Mesa onsite is unwanted.'],
    ['Entry-level role; the candidate targets senior QA roles in Seattle.', 'Entry-level role; you target senior QA roles in Seattle.'],
    ['Not the research leadership work this candidate targets.', 'Not the research leadership work you target.'],
    ['A step down for this candidate.', 'A step down for you.'],
    ["Strong match: Python and SQL align with the candidate's skills, and the applicant has led teams.", 'Strong match: Python and SQL align with your skills, and you have led teams.'],
  ])('rewrites %s', (from, to) => {
    expect(toYou(from)).toBe(to);
  });

  it('leaves what it cannot rewrite safely', () => {
    expect(toYou('Needs Top Secret clearance he likely lacks.')).toBe('Needs Top Secret clearance he likely lacks.');
    expect(toYou('Strong fit for your Python work.')).toBe('Strong fit for your Python work.');
  });
});

describe('jobMeta', () => {
  it('drops what the AI could not tell', () => {
    expect(jobMeta({ location_summary: 'San Francisco, CA', location_raw: null, work_mode: 'unknown', seniority: 'entry', years_required: 1 }))
      .toBe('San Francisco, CA · Entry · 1+ yrs');
  });
});
