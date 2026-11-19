// Reading a spreadsheet's CSV export, and guessing which column is which.

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
