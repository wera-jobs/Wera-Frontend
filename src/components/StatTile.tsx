import { useId } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useCountUp } from '../lib/useCountUp';

function CountUp({ value }: { value: number }) {
  return <>{useCountUp(value).toLocaleString()}</>;
}

/** Tiny inline sparkline; renders nothing for fewer than two points. */
export function Sparkline({
  data,
  stroke = 'var(--color-accent)',
}: {
  data: number[];
  stroke?: string;
}) {
  const id = useId();
  if (data.length < 2) return null;
  const w = 88;
  const h = 26;
  const pad = 2;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map(
    (v, i) =>
      `${(pad + (i / (data.length - 1)) * (w - 2 * pad)).toFixed(1)},${(
        h -
        pad -
        ((v - min) / span) * (h - 2 * pad)
      ).toFixed(1)}`,
  );
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        points={`${pts.join(' ')} ${w - pad},${h - pad} ${pad},${h - pad}`}
        fill={`url(#${id})`}
      />
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const dayFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

/**
 * One bar per day, most recent last and highlighted. Bars suit sparse
 * counts (a line through zero days only draws spikes); each bar names its
 * day and count on hover, and days with none show a faint tick.
 */
export function DayBars({ data, unit = 'new matches' }: { data: { day: string; count: number }[]; unit?: string }) {
  if (data.length < 2) return null;
  const w = 104;
  const h = 34;
  const gap = data.length > 10 ? 2 : 3;
  const bw = (w - gap * (data.length - 1)) / data.length;
  const max = Math.max(1, ...data.map((d) => d.count));
  const label = (d: { day: string; count: number }) => `${dayFmt.format(new Date(`${d.day}T00:00:00Z`))}: ${d.count.toLocaleString()} ${unit}`;
  return (
    <svg width={w} height={h} className="shrink-0" role="img" aria-label={data.map(label).join('; ')}>
      {data.map((d, i) => {
        const today = i === data.length - 1;
        const bh = d.count === 0 ? 2 : Math.max(3, (d.count / max) * (h - 2));
        return (
          <rect
            key={d.day}
            x={i * (bw + gap)}
            y={h - bh}
            width={bw}
            height={bh}
            rx={Math.min(2, bw / 2)}
            fill={d.count === 0 ? 'var(--color-border)' : 'var(--color-accent)'}
            opacity={d.count === 0 ? 1 : today ? 1 : 0.38}
            className="transition-opacity duration-150 hover:opacity-100"
          >
            <title>{label(d)}</title>
          </rect>
        );
      })}
    </svg>
  );
}

/**
 * Label + big mono number + optional trend chip, sparkline and sub-line.
 * Spans throughout, so the same body is valid inside a button or a link.
 */
export function StatTile({
  label,
  value,
  sub,
  delta,
  spark,
  bars,
  accent,
  className,
  onClick,
  pressed,
  to,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** Trend chip under the number, e.g. "+12 vs yesterday". */
  delta?: { text: string; tone?: 'good' | 'bad' | 'neutral' };
  /** Sparkline drawn from the series, most recent point last. */
  spark?: number[];
  /** Per-day bars (preferred for sparse daily counts), most recent last. */
  bars?: { day: string; count: number }[];
  accent?: boolean;
  className?: string;
  /** Makes the tile a toggle (a filter), pressed when `pressed`. */
  onClick?: () => void;
  pressed?: boolean;
  /** Makes the tile a link to a page. */
  to?: string;
}) {
  const tone = delta?.tone ?? 'neutral';
  const classes = clsx(
    'flex w-full flex-col rounded-card border border-border bg-surface p-3 text-left transition-colors duration-150 sm:p-4',
    accent && 'border-accent/30',
    (onClick || to) && 'cursor-pointer hover:border-accent/50',
    pressed && 'border-accent bg-accent/[0.06] ring-1 ring-accent',
    className,
  );
  const body = (
    <span className="flex items-start justify-between gap-3">
      <span className="block min-w-0">
        <span className="block text-xs font-medium text-muted">{label}</span>
        <span className="mt-1 block font-mono text-xl font-semibold tabular-nums text-text sm:mt-1.5 sm:text-2xl">
          {typeof value === 'number' ? <CountUp value={value} /> : value}
        </span>
        {sub != null && <span className="mt-1 block text-xs text-faint">{sub}</span>}
        {delta && (
          <span
            className={clsx(
              'mt-1 hidden font-mono text-[11px] tabular-nums sm:block',
              tone === 'good' && 'text-good',
              tone === 'bad' && 'text-bad',
              tone === 'neutral' && 'text-faint',
            )}
          >
            {delta.text}
          </span>
        )}
      </span>
      {bars ? (
        <span className="hidden self-end sm:block">
          <DayBars data={bars} />
        </span>
      ) : (
        spark && (
          <span className="hidden sm:block">
            <Sparkline data={spark} />
          </span>
        )
      )}
    </span>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={!!pressed} className={classes}>
        {body}
      </button>
    );
  }
  if (to) {
    return (
      <Link to={to} className={classes}>
        {body}
      </Link>
    );
  }
  return <div className={classes}>{body}</div>;
}
