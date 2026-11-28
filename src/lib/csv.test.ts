import { describe, expect, it } from 'vitest';
import type { Job } from '../api/types';
import { fixtures } from '../test/fixtures';
import { csvCell, guessColumns, parseCSV, trackerCSV } from './csv';

describe('CSV', () => {
  it('reads quotes, doubled quotes, newlines in cells, CRLF and a byte-order mark', () => {
    expect(parseCSV('﻿a,b\r\n"x, y","say ""hi"""\r\n"line\none",2\n\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
      ['line\none', '2'],
    ]);
  });

  it("guesses columns from Wera's own export and other trackers' headers", () => {
    expect(guessColumns(['company', 'title', 'status', 'fit_score', 'location', 'url', 'notes', 'posting_closed'])).toEqual({
      company: 0, title: 1, url: 5, status: 2, location: 4, notes: 6, applied: -1,
    });
    expect(guessColumns(['Position', 'Employer', 'Stage', 'Job Link', 'Date Applied'])).toMatchObject({
      company: 1, title: 0, status: 2, url: 3, applied: 4,
    });
  });

  it('quotes every cell, doubles quotes and defuses formulas', () => {
    expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('-1+2')).toBe(`"'-1+2"`);
    expect(csvCell(null)).toBe('""');
    expect(csvCell(87)).toBe('"87"');
  });

  it('exports the tracker with dates, and its own export reads back in', () => {
    const job: Job = {
      ...(fixtures.jobs.jobs[0] as Job), company: 'Acme, Inc.', title: 'Data "Lead"', application_status: 'applied', fit_score: 84,
      applied_at: '2026-11-02T15:00:00Z', first_seen_at: '2026-10-30T08:00:00Z', next_step: 'Email Sam', next_step_at: '2026-11-20T09:00:00Z',
      url: 'https://jobs.example/1', application_notes: 'line one\nline two', location_summary: 'Austin, TX',
    };
    const csv = trackerCSV([job]);
    expect(csv.endsWith('\r\n')).toBe(true);
    const [header, row] = parseCSV(csv);
    const cell = (name: string) => row[header.indexOf(name)];
    expect(cell('company')).toBe('Acme, Inc.');
    expect(cell('title')).toBe('Data "Lead"');
    expect(cell('applied')).toBe('2026-11-02');
    expect(cell('first_seen')).toBe('2026-10-30');
    expect(cell('next_step_due')).toBe('2026-11-20');
    expect(cell('notes')).toBe('line one\nline two');
    expect(guessColumns(header)).toMatchObject({ company: 0, title: 1, status: 2, location: 5, applied: 6, url: 10, notes: 11 });
  });
});
