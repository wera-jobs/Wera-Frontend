import { useMemo } from 'react';

interface SkillMatcher {
  re: RegExp;
  kind: Map<string, 'matched' | 'missing'>;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildMatcher(matched: string[], missing: string[]): SkillMatcher | null {
  const kind = new Map<string, 'matched' | 'missing'>();
  for (const s of missing) {
    const t = s.trim();
    if (t.length >= 2) kind.set(t.toLowerCase(), 'missing');
  }
  for (const s of matched) {
    const t = s.trim();
    if (t.length >= 2) kind.set(t.toLowerCase(), 'matched');
  }
  if (kind.size === 0) return null;
  // Longest terms first so "TypeScript" matches before "Script" and "Node.js" before "Node".
  const terms = [...kind.keys()].sort((a, b) => b.length - a.length).map(escapeRe);
  // Lookarounds avoid matching inside longer words while still working for symbols like C++ or C#.
  return {
    re: new RegExp(`(?<![\\p{L}\\p{N}])(${terms.join('|')})(?![\\p{L}\\p{N}])`, 'giu'),
    kind,
  };
}

/**
 * Renders a plain-text job description: blocks are separated by blank
 * lines; a short block without closing punctuation reads as a heading; a
 * block of several lines (or lines starting with a bullet) reads as a
 * list. Optionally highlights matched and missing skills inline.
 */
export function Description({
  text,
  matched = [],
  missing = [],
  highlight = false,
}: {
  text: string;
  matched?: string[];
  missing?: string[];
  highlight?: boolean;
}) {
  const matcher = useMemo(
    () => (highlight ? buildMatcher(matched, missing) : null),
    [highlight, matched, missing],
  );
  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3 text-[13.5px] leading-relaxed text-muted">
      {blocks.map((block, i) => {
        const lines = block.split('\n').map((l) => l.replace(/^[-•*·▪●]\s*/, '').trim());
        const bulleted = /^[-•*·▪●]\s/.test(block);
        if (lines.length === 1 && !bulleted && isHeading(lines[0], blocks[i + 1])) {
          return (
            <h4 key={i} className="pt-2 text-sm font-semibold text-text first:pt-0">
              {lines[0]}
            </h4>
          );
        }
        if (lines.length > 1 || bulleted) {
          return (
            <ul key={i} className="space-y-1.5">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-2.5">
                  <span className="mt-[9px] size-1 shrink-0 rounded-full bg-faint" />
                  <span>
                    <Linkify text={l} matcher={matcher} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            <Linkify text={lines[0]} matcher={matcher} />
          </p>
        );
      })}
    </div>
  );
}

function isHeading(line: string, next: string | undefined): boolean {
  return next != null && line.length <= 60 && !/[.;,!?)]$/.test(line) && line.split(' ').length <= 8;
}

const URL_RE = /(https?:\/\/[^\s)]+[^\s).,;:!?'"])/g;

function HighlightSkills({ text, matcher }: { text: string; matcher: SkillMatcher | null }) {
  if (!matcher) return <>{text}</>;
  const parts = text.split(matcher.re);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part;
        const k = matcher.kind.get(part.toLowerCase());
        if (!k) return part;
        return (
          <mark
            key={i}
            title={k === 'matched' ? 'Matched on your profile' : 'Missing from your profile'}
            className={
              k === 'matched'
                ? 'rounded bg-good/15 px-1 py-px font-medium text-good'
                : 'rounded bg-warn/15 px-1 py-px font-medium text-warn'
            }
          >
            {part}
          </mark>
        );
      })}
    </>
  );
}

/** Turns bare http(s) URLs into links that open in a new tab, and highlights skills in non-URL text. */
function Linkify({ text, matcher }: { text: string; matcher: SkillMatcher | null }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={p}
            target="_blank"
            rel="noreferrer"
            className="break-all text-accent-2 underline decoration-current/40 underline-offset-2 hover:decoration-current"
          >
            {p.replace(/^https?:\/\/(www\.)?/, '')}
          </a>
        ) : (
          <HighlightSkills key={i} text={p} matcher={matcher} />
        ),
      )}
    </>
  );
}
