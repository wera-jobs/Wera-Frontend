import { useState } from 'react';
import clsx from 'clsx';

// Height sets the size; a logo keeps its own shape up to about 3.5 times as wide (wordmarks), a letter tile is square.
const SIZE = {
  sm: { box: 'h-4 rounded', wide: 'max-w-14', square: 'w-4 text-[9px]' },
  md: { box: 'h-5 rounded-md', wide: 'max-w-[4.5rem]', square: 'w-5 text-[10px]' },
  lg: { box: 'h-8 rounded-lg', wide: 'max-w-28', square: 'w-8 text-sm' },
};

/**
 * A company's logo, served by Wera itself (logo_url), on a white tile since
 * logos are drawn for light pages; a lettered tile when there is none or it
 * fails to load. Decorative: the company's name always sits beside it.
 */
export function CompanyLogo({ name, url, size = 'sm', className }: { name: string; url?: string | null; size?: keyof typeof SIZE; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const s = SIZE[size];
  const tile = clsx('inline-flex shrink-0 items-center justify-center overflow-hidden border border-border', s.box, className);
  if (url && failed !== url) {
    return (
      <span className={clsx(tile, s.wide, 'bg-white px-px')} aria-hidden="true">
        <img src={url} alt="" loading="lazy" decoding="async" onError={() => setFailed(url)} className="h-full w-auto max-w-full object-contain py-px" />
      </span>
    );
  }
  const letter = name.trim().match(/[\p{L}\p{N}]/u)?.[0]?.toUpperCase() ?? '·';
  return (
    <span className={clsx(tile, s.square, 'bg-surface-2 font-semibold text-muted')} aria-hidden="true">
      {letter}
    </span>
  );
}
