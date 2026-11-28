// Reading a spreadsheet's CSV export, and guessing which column is which;
// writing the tracker's own export.
import type { Job } from '../api/types';
import { payText } from './format';

/** Parses CSV (RFC 4180: quoted cells, doubled quotes, newlines in quotes, CRLF, a byte-order mark). */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const s = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === '') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

export const IMPORT_FIELDS = ['company', 'title', 'url', 'status', 'location', 'notes', 'applied'] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

export const FIELD_LABEL: Record<ImportField, string> = {
  company: 'Company', title: 'Job title', url: 'Link to the job', status: 'Status', location: 'Location', notes: 'Notes', applied: 'Date applied',
};

// Header words other trackers and spreadsheets use for each field.
const HINTS: Record<ImportField, RegExp> = {
  company: /^(company|employer|organi[sz]ation|company name)$/i,
  title: /^(title|job title|position|role|job)$/i,
  url: /^(url|link|job (url|link)|posting|job posting|application link)$/i,
  status: /^(status|stage|state|application status)$/i,
  location: /^(location|city|where)$/i,
  notes: /^(notes?|comments?|description)$/i,
  applied: /^(date applied|applied( on| at| date)?|application date|date)$/i,
};

/** The column (index) each field most likely sits in, from the header row; -1 when none. */
export function guessColumns(header: string[]): Record<ImportField, number> {
  const out = {} as Record<ImportField, number>;
  for (const f of IMPORT_FIELDS) out[f] = header.findIndex((h) => HINTS[f].test(h.trim()));
  return out;
}

type Cell = string | number | null | undefined;

/**
 * One CSV cell, always quoted with quotes doubled. A cell starting with
 * = + - @ or a tab gets a leading apostrophe, so a spreadsheet shows it
 * rather than running it as a formula.
 */
export function csvCell(v: Cell): string {
  const s = String(v ?? '');
  return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
}

/** Rows to RFC 4180 CSV: CRLF line ends, every cell quoted. */
export function toCSV(rows: Cell[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '');

/** The tracker's export: a header, then one row per application. Its headers read back in through the importer. */
export function trackerCSV(jobs: Job[]): string {
  return toCSV([
    ['company', 'title', 'status', 'fit_score', 'pay', 'location', 'applied', 'first_seen', 'next_step', 'next_step_due', 'url', 'notes'],
    ...jobs.map((j) => [
      j.company, j.title, j.application_status, j.fit_score, payText(j, true), j.location_summary ?? j.location_raw,
      day(j.applied_at), day(j.first_seen_at), j.next_step, day(j.next_step_at), j.url, j.application_notes,
    ]),
  ]);
}
