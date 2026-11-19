// Saved Jobs searches hold the filter part of the Jobs query string.

const FILTER_KEYS = ['q', 'industry', 'category', 'min_score', 'min_pay', 'sponsorship', 'work_mode', 'status', 'posted_within', 'sort'];

/** The filter part of a Jobs query string, sorted, so equal filters compare equal. */
export function filterQuery(search: string): string {
  const sp = new URLSearchParams(search);
  const out = new URLSearchParams();
  for (const k of [...FILTER_KEYS].sort()) {
    const v = sp.get(k);
    if (v) out.set(k, v);
  }
  return out.toString();
}
