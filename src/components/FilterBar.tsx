import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, FilterX, Search, SlidersHorizontal, X } from 'lucide-react';
import { useIndustries, useStats } from '../api/hooks';
import { APP_STATUSES } from './StatusSelect';
import { useFamilyLabel } from '../api/profile';

export interface FilterValues {
  q: string;
  industry: string;
  category: string;
  min_score: number;
  min_pay: number;
  sponsorship: string;
  work_mode: string;
  status: string;
  posted_within: number;
  followed?: number;
  sort: string;
}

export const DEFAULT_FILTERS: FilterValues = {
  q: '',
  industry: '',
  category: '',
  min_score: 0,
  min_pay: 0,
  sponsorship: '',
  work_mode: '',
  status: '',
  posted_within: 0,
  followed: 0,
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
  defaultSort = 'score',
  onChange,
  onReset,
}: {
  values: FilterValues;
  /** The person's own default order (Settings): only another order counts as a filter. */
  defaultSort?: FilterValues['sort'];
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

  const active = [values.industry, values.category, values.min_score, values.min_pay, values.sponsorship, values.work_mode, values.status, values.posted_within, values.followed, values.sort !== defaultSort]
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
          label="Pay"
          value={String(values.min_pay)}
          onChange={(v) => onChange({ min_pay: Number(v) })}
          options={[
            { value: '0', label: 'Any' },
            { value: '50000', label: '$50K+ a year' },
            { value: '80000', label: '$80K+ a year' },
            { value: '100000', label: '$100K+ a year' },
            { value: '150000', label: '$150K+ a year' },
            { value: '200000', label: '$200K+ a year' },
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
            onClick={() => {
              // A search still being typed must not land after the reset.
              setText('');
              onReset();
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-muted transition-colors duration-150 hover:border-bad/40 hover:text-bad"
          >
            <FilterX className="size-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Quick-filter presets & removable active chips */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2.5">
        <span className="mr-0.5 text-[10px] font-medium tracking-wide text-faint uppercase">Quick</span>
        {(
          [
            { label: 'Strong fit (80+)', active: values.min_score >= 80, toggle: () => onChange({ min_score: values.min_score >= 80 ? 0 : 80 }) },
            { label: 'Remote', active: values.work_mode === 'remote', toggle: () => onChange({ work_mode: values.work_mode === 'remote' ? '' : 'remote' }) },
            { label: 'Sponsors', active: values.sponsorship === 'yes', toggle: () => onChange({ sponsorship: values.sponsorship === 'yes' ? '' : 'yes' }) },
            { label: 'Past 24h', active: values.posted_within === 1, toggle: () => onChange({ posted_within: values.posted_within === 1 ? 0 : 1 }) },
            { label: 'Following', active: values.followed === 1, toggle: () => onChange({ followed: values.followed === 1 ? 0 : 1 }) },
          ] as const
        ).map((preset) => (
          <button
            key={preset.label}
            type="button"
            aria-pressed={preset.active}
            onClick={preset.toggle}
            className={clsx(
              'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
              preset.active ? 'border-accent/50 bg-accent/10 text-accent' : 'border-border bg-surface-2/60 text-muted hover:text-text',
            )}
          >
            {preset.label}
          </button>
        ))}

        {(() => {
          const chips: { key: string; label: string; clear: () => void }[] = [];
          if (values.industry) {
            const name = industries.data?.industries.find((i) => i.id === values.industry)?.label ?? values.industry;
            chips.push({ key: 'industry', label: name, clear: () => onChange({ industry: '' }) });
          }
          if (values.category) chips.push({ key: 'category', label: familyLabel(values.category), clear: () => onChange({ category: '' }) });
          if (values.work_mode && values.work_mode !== 'remote') chips.push({ key: 'work_mode', label: values.work_mode, clear: () => onChange({ work_mode: '' }) });
          if (values.sponsorship && values.sponsorship !== 'yes') chips.push({ key: 'sponsorship', label: `Sponsorship: ${values.sponsorship}`, clear: () => onChange({ sponsorship: '' }) });
          if (values.status) {
            const label = APP_STATUSES.find((s) => s.value === values.status)?.label ?? values.status;
            chips.push({ key: 'status', label, clear: () => onChange({ status: '' }) });
          }
          if (values.min_pay > 0) chips.push({ key: 'min_pay', label: `$${Math.round(values.min_pay / 1000)}K+`, clear: () => onChange({ min_pay: 0 }) });
          if (values.posted_within > 1) chips.push({ key: 'posted_within', label: `Past ${values.posted_within}d`, clear: () => onChange({ posted_within: 0 }) });
          if (values.min_score > 0 && values.min_score < 80) chips.push({ key: 'min_score', label: `${values.min_score}+ fit`, clear: () => onChange({ min_score: 0 }) });
          if (chips.length === 0) return null;
          return (
            <>
              <span aria-hidden className="mx-1 h-3.5 w-px bg-border" />
              {chips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={c.clear}
                  aria-label={`Remove ${c.label} filter`}
                  className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent hover:bg-accent/15"
                >
                  {c.label} <X className="size-3" />
                </button>
              ))}
            </>
          );
        })()}
      </div>
    </div>
  );
}

