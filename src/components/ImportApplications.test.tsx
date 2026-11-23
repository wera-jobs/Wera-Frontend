import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Toasts } from '../lib/toast';
import { stubApi } from '../test/fixtures';
import { jsonBody, renderApp } from '../test/render';
import { ImportApplications } from './ImportApplications';

describe('importing applications', () => {
  it('maps the columns, checks every row, then imports the good ones', async () => {
    const calls: { dry_run: boolean; rows: Record<string, string>[] }[] = [];
    stubApi({
      'POST /api/applications/import': (init) => {
        const b = jsonBody<{ dry_run: boolean; rows: Record<string, string>[] }>(init);
        calls.push(b);
        return {
          results: [{ row: 1, ok: true, status: 'applied' }, { row: 2, ok: false, error: 'needs the job\'s web address' }],
          imported: b.dry_run ? 0 : 1,
        };
      },
    });
    renderApp(
      <>
        <ImportApplications />
        <Toasts />
      </>,
    );
    const csv = 'Position,Employer,Stage,Job Link\nSRE,Acme,Applied,https://acme.example/1\nAnalyst,Globex,Wishlist,\n';
    const file = new File([csv], 'tracker.csv', { type: 'text/csv' });
    fireEvent.change(screen.getByLabelText(/Choose a CSV/), { target: { files: [file] } });
    expect(await screen.findByText(/2 rows in tracker.csv/)).toBeInTheDocument();
    expect(screen.getByLabelText('Company')).toHaveValue('1');
    await userEvent.click(screen.getByRole('button', { name: 'Check the rows' }));
    expect(await screen.findByText(/1 ready to import, 1 can't be read/)).toBeInTheDocument();
    // Row numbers count the header, as in the spreadsheet.
    expect(screen.getByText("Row 3: needs the job's web address")).toBeInTheDocument();
    expect(calls[0]).toMatchObject({ dry_run: true, rows: [{ company: 'Acme', title: 'SRE', status: 'Applied', url: 'https://acme.example/1' }, { company: 'Globex' }] });
    await userEvent.click(screen.getByRole('button', { name: 'Import 1' }));
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].dry_run).toBe(false);
    expect(await screen.findByText('Imported 1 job into your tracker.')).toBeInTheDocument();
    // Done: nothing left to import twice, and the same file can be picked again.
    expect(screen.queryByRole('button', { name: /^Import/ })).toBeNull();
    expect(screen.queryByText(/rows in tracker.csv/)).toBeNull();
    const input = screen.getByLabelText<HTMLInputElement>(/Choose a CSV/);
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByText(/2 rows in tracker.csv/)).toBeInTheDocument();
    expect(input.value).toBe('');
  });
});
