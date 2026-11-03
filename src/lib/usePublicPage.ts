import { useEffect } from 'react';

export const SITE = 'https://www.wera-jobs.com';

/**
 * For pages search engines should index: points the canonical link at the
 * public address, so copies of the site at other hosts are not indexed as
 * separate pages, and sets the page's description. Both go back to the
 * site-wide defaults when the page closes.
 */
export function usePublicPage(path: string, description?: string) {
  useEffect(() => {
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = `${SITE}${path}`;
    document.head.appendChild(canonical);

    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const before = meta?.content;
    if (meta && description) meta.content = description;
    return () => {
      canonical.remove();
      if (meta && before !== undefined) meta.content = before;
    };
  }, [path, description]);
}
