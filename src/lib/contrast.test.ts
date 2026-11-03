import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// The accessibility page promises small text at 4.5:1 or better in both
// themes. This reads the color tokens from index.css and holds them to it.

// Tests run from the repository root.
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

function tokens(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6});/g)].map((m) => [m[1], m[2]]));
}

const dark = tokens(css.slice(css.indexOf('@theme'), css.indexOf(':root[data-theme="light"]')));
const light = { ...dark, ...tokens(css.slice(css.indexOf(':root[data-theme="light"]'), css.indexOf('@layer base'))) };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** A 10% layer of color over a background, as Tailwind's bg-color/10 draws it. */
function tint(color: string, bg: string): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16);
  return `#${[1, 3, 5].map((i) => Math.round(channel(color, i) * 0.1 + channel(bg, i) * 0.9).toString(16).padStart(2, '0')).join('')}`;
}

const TEXT = ['text', 'muted', 'faint', 'accent', 'accent-2', 'good', 'warn', 'bad'];
const BACKGROUNDS = ['bg', 'surface', 'surface-2'];

describe.each([['dark', dark], ['light', light]])('%s theme', (_, theme) => {
  it.each(TEXT)('%s text reads at 4.5:1 on every background', (name) => {
    for (const bg of BACKGROUNDS) {
      expect(contrast(theme[name], theme[bg]), `${name} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  // Status pills put a color on a 10% tint of itself: bg-good/10 text-good.
  it.each(['accent', 'accent-2', 'good', 'warn', 'bad'])('%s text reads at 4.5:1 on its own tinted badge', (name) => {
    for (const bg of BACKGROUNDS) {
      expect(contrast(theme[name], tint(theme[name], theme[bg])), `${name} on its tint over ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps button text readable on the accent', () => {
    expect(contrast(theme.bg, theme.accent)).toBeGreaterThanOrEqual(4.5);
  });
});
