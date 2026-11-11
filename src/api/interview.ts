import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionKind = 'technical' | 'behavioral' | 'product';

export interface DomainStat {
  domain: string;
  kind: QuestionKind;
  questions: number;
  answered: number;
  correct: number;
}

/** How the user has been practicing: days in a row, this week, and what to review. */
export interface Practice {
  streak: number;
  week: number;
  missed: number;
  last_day?: string;
}

export interface Question {
  id: number;
  domain: string;
  kind: QuestionKind;
  difficulty: Difficulty;
  question: string;
  choices: string[];
  tags?: string[];
}

export interface AnswerResult {
  correct: boolean;
  answer: number;
  explanation: string;
}

/** A role's interview loop: the domains it weighs and its work simulations. */
export interface Track {
  id: string;
  label: string;
  blurb: string;
  domains: string[];
  stack: { tag: string; count: number }[];
  scenarios: string[];
}

export interface Person {
  name: string;
  role: string;
}

export interface ScenarioProgress {
  answered: number;
  points: number;
  /** Best finished run, or -1. */
  best: number;
  choices?: number[];
}

export interface ScenarioCard {
  id: string;
  tracks: string[];
  title: string;
  role: string;
  blurb: string;
  difficulty: Difficulty;
  cast: Person[];
  steps: number;
  max_points: number;
  skills: string[];
  progress: ScenarioProgress;
}

export interface Email {
  from: string;
  to: string;
  cc?: string[];
  subject: string;
  when: string;
  body: string;
}

export interface ScenarioStep {
  skill: string;
  email: Email;
  prompt: string;
  choices: string[];
}

export type Rating = 'best' | 'okay' | 'weak';

/** A step once answered: every reply's rating and why. */
export interface StepReveal {
  step: number;
  choice: number;
  rating: Rating;
  points: number;
  choices: { text: string; rating: Rating; feedback: string }[];
  takeaway: string;
}

export interface ScenarioDetail {
  scenario: ScenarioCard;
  steps: ScenarioStep[];
  answered: StepReveal[];
}

export interface QuizParams {
  track?: string;
  domain?: string;
  difficulty?: Difficulty | '';
  stack?: string[];
  missed?: boolean;
}

function timeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function useDomains() {
  return useQuery({
    queryKey: ['interview', 'domains'],
    queryFn: () => api<{ domains: DomainStat[]; practice?: Practice }>(`/api/interview/domains?tz=${encodeURIComponent(timeZone())}`),
  });
}

export function useTracks() {
  return useQuery({
    queryKey: ['interview', 'tracks'],
    queryFn: () => api<{ tracks: Track[]; suggested: string }>('/api/interview/tracks'),
    staleTime: 10 * 60_000,
  });
}

export function useScenarios() {
  return useQuery({
    queryKey: ['interview', 'scenarios'],
    queryFn: () => api<{ scenarios: ScenarioCard[] }>('/api/interview/scenarios'),
  });
}

export function useScenario(id: string | null) {
  return useQuery({
    queryKey: ['interview', 'scenario', id],
    queryFn: () => api<ScenarioDetail>(`/api/interview/scenarios/${encodeURIComponent(id!)}`),
    enabled: !!id,
    // A run moves on as the user answers: always read where it stands.
    staleTime: 0,
    gcTime: 0,
  });
}

/** The query string of a round. */
export function quizQuery(v: QuizParams): string {
  const sp = new URLSearchParams({ limit: '10' });
  if (v.track && !v.domain) sp.set('track', v.track);
  if (v.domain) sp.set('domain', v.domain);
  if (v.difficulty) sp.set('difficulty', v.difficulty);
  if (v.stack?.length) sp.set('stack', v.stack.join(','));
  if (v.missed) sp.set('missed', '1');
  return sp.toString();
}

/** Fetches a fresh quiz each time it is started (no caching across rounds). */
export function useStartQuiz() {
  return useMutation({
    mutationFn: (v: QuizParams) => api<{ questions: Question[] }>(`/api/interview/quiz?${quizQuery(v)}`),
  });
}

export function useAnswer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; choice: number }) =>
      api<AnswerResult>(`/api/interview/questions/${v.id}/answer`, {
        method: 'POST',
        body: JSON.stringify({ choice: v.choice }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['interview', 'domains'] }),
  });
}

export function useAnswerStep(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { step: number; choice: number }) =>
      api<StepReveal>(`/api/interview/scenarios/${encodeURIComponent(id)}/steps/${v.step}/answer`, {
        method: 'POST',
        body: JSON.stringify({ choice: v.choice }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['interview', 'scenarios'] });
      void qc.invalidateQueries({ queryKey: ['interview', 'domains'] });
    },
  });
}

/** The track a job title most likely interviews for. */
export function trackForTitle(title: string): string {
  const t = title.toLowerCase();
  if (/full[\s-]?stack/.test(t)) return 'fullstack';
  if (/front[\s-]?end|\breact\b|\bui\b|web developer|web engineer/.test(t)) return 'frontend';
  if (/\bios\b|android|mobile/.test(t)) return 'mobile';
  if (/devops|\bsre\b|reliability|platform|infrastructure|cloud|systems? admin|network/.test(t)) return 'infra';
  if (/\bdata\b|machine learning|\bml\b|\bai\b|analyst|analytics|scientist|quant/.test(t)) return 'data';
  if (/product manager|program manager|product owner|\bpm\b|designer/.test(t)) return 'product';
  if (/engineer|developer|backend|back[\s-]end|software|programmer/.test(t)) return 'backend';
  return 'general';
}
