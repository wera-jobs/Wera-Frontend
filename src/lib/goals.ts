import { useCallback, useState } from 'react';

const KEY = 'wera.weekly_goal';

export function readWeeklyGoal(): number {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n) : 0;
  } catch {
    return 0;
  }
}

export function writeWeeklyGoal(goal: number): number {
  const clamped = Math.max(0, Math.min(100, Math.round(goal)));
  try {
    if (clamped === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, String(clamped));
  } catch {
    // Private browsing: keeps in-memory state only.
  }
  return clamped;
}

/** User-configurable weekly application target, persisted in localStorage. */
export function useWeeklyGoal() {
  const [goal, setGoalState] = useState<number>(() => readWeeklyGoal());
  const setGoal = useCallback((next: number) => {
    setGoalState(writeWeeklyGoal(next));
  }, []);
  return [goal, setGoal] as const;
}
