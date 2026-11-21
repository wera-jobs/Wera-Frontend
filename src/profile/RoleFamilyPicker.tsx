import { useState } from 'react';
import clsx from 'clsx';
import type { Choice, RoleFamilyChoice } from '../api/types';
import { ChipSelect } from './ChipSelect';

const byLabel = (a: Choice, b: Choice) => a.label.localeCompare(b.label);

/**
 * Role families grouped by career field: one tab per field (with how many
 * of its roles are picked) and that field's roles as chips. Opens on the
 * field with the most picked roles, so a nurse lands on Healthcare and a
 * finance student on Business, and follows picks that arrive later (the
 * resume pre-fill lands after the step opens) until the person chooses.
 */
export function RoleFamilyPicker({
  fields,
  families,
  value,
  onChange,
}: {
  fields?: Choice[];
  families: RoleFamilyChoice[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const grouped = (fields ?? []).filter((f) => families.some((r) => r.field === f.id));
  const fieldOf = (id: string) => families.find((r) => r.id === id)?.field;
  // The tab the person chose (a tab, or a chip in one); until then the tab follows the picks.
  const [chosen, setChosen] = useState<string>();
  if (grouped.length < 2) {
    return <ChipSelect label="Role families" options={[...families].sort(byLabel)} value={value} onChange={onChange} />;
  }
  const pickedIn = (field: string) => value.filter((id) => fieldOf(id) === field).length;
  // The field with the most picks; a tie goes to the field listed first.
  const mostPicked = grouped.reduce((best, f) => (pickedIn(f.id) > pickedIn(best.id) ? f : best), grouped[0]);
  const active = chosen && grouped.some((f) => f.id === chosen) ? chosen : mostPicked.id;
  const shown = families.filter((r) => r.field === active).sort(byLabel);
  return (
    <div className="space-y-2.5">
      <div role="tablist" aria-label="Career fields" className="flex flex-wrap gap-1.5">
        {grouped.map((f) => {
          const picked = pickedIn(f.id);
          const on = f.id === active;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setChosen(f.id)}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors duration-150',
                on ? 'border-accent/60 bg-accent/10 text-text' : 'border-border bg-surface-2 text-muted hover:text-text',
              )}
            >
              {f.label}
              {picked > 0 && (
                <span className="rounded-full bg-accent/20 px-1.5 text-[10px] text-accent">
                  {picked}<span className="sr-only"> picked</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" aria-label={grouped.find((f) => f.id === active)?.label}>
        <ChipSelect
          label="Role families"
          options={shown}
          value={value}
          // Picks in other fields stay picked while this one changes, and the tab
          // stays put: unpicking the last role here must not jump to another field.
          onChange={(v) => {
            setChosen(active);
            onChange([...value.filter((id) => fieldOf(id) !== active), ...v.filter((id) => fieldOf(id) === active)]);
          }}
        />
      </div>
    </div>
  );
}
