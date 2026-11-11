import clsx from 'clsx';
import type { Difficulty } from '../../api/interview';

export function DifficultyPill({ d }: { d: Difficulty }) {
  return (
    <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-medium capitalize',
      d === 'easy' && 'bg-good/10 text-good', d === 'medium' && 'bg-warn/10 text-warn', d === 'hard' && 'bg-bad/10 text-bad')}>
      {d}
    </span>
  );
}
