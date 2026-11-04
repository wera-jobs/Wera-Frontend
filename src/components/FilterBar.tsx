import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, FilterX, Search, SlidersHorizontal } from 'lucide-react';
import { useIndustries, useStats } from '../api/hooks';
import { APP_STATUSES } from './StatusSelect';
import { useFamilyLabel } from '../api/profile';

export interface FilterValues {
  q: string;
  industry: string;
  category: string;
  min_score: number;
  sponsorship: string;
  work_mode: string;
  status: string;
  posted_within: number;
  sort: string;
}

export const DEFAULT_FILTERS: FilterValues = {
  q: '',
  industry: '',
  category: '',
  min_score: 0,
  sponsorship: '',
  work_mode: '',
  status: '',
  posted_within: 0,
  sort: 'score',
};

const SELECT_CLS =
  'w-full appearance-none rounded-lg border border-border bg-surface-2 py-1.5 pr-7 pl-2.5 text-xs font-medium text-text transition-colors duration-150 hover:border-accent/40';

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="relative flex flex-col gap-1">
      <span className="text-[10px] font-medium tracking-wide text-faint uppercase">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={SELECT_CLS}
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 bottom-2 size-3.5 text-faint" />
    </label>
  );
}

/** Search + filters; state lives in the Jobs page URL, this bar only edits it. */
export function FilterBar({
  values,
  onChange,
  onReset,
}: {
  values: FilterValues;
  onChange: (patch: Partial<FilterValues>) => void;
  onReset: () => void;
}) {
  const [text, setText] = useState(values.q);
  const [syncedQ, setSyncedQ] = useState(values.q);
  const [open, setOpen] = useState(false);
  const stats = useStats();
  const industries = useIndustries();

  // Keep the raw input in sync when filters change outside (reset / back nav).
  if (values.q !== syncedQ) {
    setSyncedQ(values.q);
    setText(values.q);
  }

  // Debounce search input into the URL.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (text !== values.q) onChange({ q: text });
    }, 300);
    return () => window.clearTimeout(t);
  }, [text, values.q, onChange]);

  // Readable role names, A to Z, so a category is easy to find.
  const familyLabel = useFamilyLabel();
  const categories = Object.keys(stats.data?.by_category ?? {})
    .map((value) => ({ value, label: familyLabel(value) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const active = [values.industry, values.category, values.min_score, values.sponsorship, values.work_mode, values.status, values.posted_within, values.sort !== 'score']
    .filter(Boolean).length;
  const isDefault = values.q === '' && active === 0;

  return (
    <div className="rounded-card border border-border bg-surface p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="relative flex min-w-52 flex-1 flex-col gap-1">
          <span className="text-[10px] font-medium tracking-wide text-faint uppercase">Search</span>
          <Search className="absolute bottom-2.5 left-2.5 size-3.5 text-faint" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Title or company…"
            aria-label="Search jobs"
            className="w-full rounded-lg border border-border bg-surface-2 py-1.5 pr-2.5 pl-8 text-xs text-text placeholder:text-faint transition-colors duration-150 hover:border-accent/40"
          />
        </label>

        {/* On a phone the filters wait behind a button, so the jobs come first. */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 self-end rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm font-medium text-text md:hidden"
        >
          <SlidersHorizontal className="size-3.5" /> Filters
          {active > 0 && <span className="rounded-full bg-accent px-1.5 text-xs font-semibold text-bg">{active}</span>}
        </button>

        <div className={clsx('md:contents', open ? 'contents' : 'hidden')}>
        <Select
          label="Industry"
          value={values.industry}
          onChange={(v) => onChange({ industry: v })}
          options={[
            { value: '', label: 'All industries' },
            ...(industries.data?.industries ?? []).map((i) => ({ value: i.id, label: i.label })),
          ]}
        />
        <Select
          label="Category"
          value={values.category}
          onChange={(v) => onChange({ category: v })}
          options={[{ value: '', label: 'All categories' }, ...categories]}
        />
        <Select
          label="Sponsorship"
          value={values.sponsorship}
          onChange={(v) => onChange({ sponsorship: v })}
          options={[
            { value: '', label: 'Any' },
            { value: 'yes', label: 'Yes' },
            { value: 'unknown', label: 'Unknown' },
          ]}
        />
        <Select
          label="Work mode"
          value={values.work_mode}
          onChange={(v) => onChange({ work_mode: v })}
          options={[
            { value: '', label: 'Any' },
            { value: 'remote', label: 'Remote' },
            { value: 'hybrid', label: 'Hybrid' },
            { value: 'onsite', label: 'Onsite' },
          ]}
        />
        <Select
          label="Status"
          value={values.status}
          onChange={(v) => onChange({ status: v })}
          options={[
            { value: '', label: 'Any status' },
            ...APP_STATUSES.map((s) => ({ value: s.value, label: s.label })),
          ]}
        />
        <Select
          label="Posted"
          value={String(values.posted_within)}
          onChange={(v) => onChange({ posted_within: Number(v) })}
          options={[
            { value: '0', label: 'Any time' },
            { value: '1', label: 'Past 24 hours' },
            { value: '7', label: 'Past week' },
            { value: '30', label: 'Past month' },
            { value: '60', label: 'Past 2 months' },
          ]}
        />
        <Select
          label="Sort"
          value={values.sort}
          onChange={(v) => onChange({ sort: v })}
          options={[
            { value: 'score', label: 'Best fit' },
            { value: 'newest', label: 'Newest' },
          ]}
        />

        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium tracking-wide text-faint uppercase">
            Min score{values.min_score > 0 ? `: ${values.min_score}` : ''}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={values.min_score}
            onChange={(e) => onChange({ min_score: Number(e.target.value) })}
            aria-label="Minimum score"
            className="h-7 w-32 accent-accent"
          />
        </label>
        </div>

        {!isDefault && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-muted transition-colors duration-150 hover:border-bad/40 hover:text-bad"
          >
            <FilterX className="size-3.5" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}

