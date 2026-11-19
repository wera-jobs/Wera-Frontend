import { describe, expect, it } from 'vitest';
import { guessColumns, parseCSV } from './csv';

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
});
