import { useCallback, useState } from 'react';
import { useSaveSettings, useSettings } from '../api/hooks';

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

/**
 * User-configurable weekly application target, synced with PUT /api/settings
 * (`weekly_application_goal`) and mirrored to localStorage for instant paint.
 */
export function useWeeklyGoal() {
  const settings = useSettings();
  const save = useSaveSettings();
  const [local, setLocal] = useState<number>(() => readWeeklyGoal());
  const serverGoal = settings.data?.weekly_application_goal;
  const goal = serverGoal != null ? serverGoal : local;

  const setGoal = useCallback(
    (next: number) => {
      const clamped = writeWeeklyGoal(next);
      setLocal(clamped);
      if (settings.data) {
        const { hidden_companies: _hidden, ...rest } = settings.data;
        save.mutate({ ...rest, weekly_application_goal: clamped });
      }
    },
    [settings.data, save],
  );

  return [goal, setGoal] as const;
}
