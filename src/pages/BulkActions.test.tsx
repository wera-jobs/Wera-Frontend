import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Toasts } from '../lib/toast';
import { fixtures, stubApi } from '../test/fixtures';
import { jsonBody, renderApp } from '../test/render';
import JobsPage from './JobsPage';

const base = fixtures.jobs.jobs[0];
const rows = [
  { ...base, id: 501, title: 'Role One', company: 'Acme', company_id: 11, application_status: null },
  { ...base, id: 502, title: 'Role Two', company: 'Acme', company_id: 11, application_status: 'saved' as const },
  { ...base, id: 503, title: 'Role Three', company: 'Globex', company_id: 12, application_status: null },
];

function stub() {
  const calls: string[] = [];
  const handlers = Object.fromEntries(
    rows.flatMap((j) => [
      [`PUT /api/jobs/${j.id}/application`, (init: RequestInit | undefined) => {
        calls.push(`PUT ${j.id} ${jsonBody<{ status: string }>(init).status}`);
        return { ...j };
      }],
      [`DELETE /api/jobs/${j.id}/application`, () => {
        calls.push(`DELETE ${j.id}`);
        return { ...j };
      }],
    ]),
  );
  stubApi({
    'GET /api/jobs': () => ({ ...fixtures.jobs, total: 3, jobs: rows }),
    'PUT /api/companies/11/hidden': () => (calls.push('hide 11'), undefined),
    'PUT /api/companies/12/hidden': () => (calls.push('hide 12'), undefined),
    'DELETE /api/companies/11/hidden': () => (calls.push('unhide 11'), undefined),
    'DELETE /api/companies/12/hidden': () => (calls.push('unhide 12'), undefined),
    ...handlers,
  });
  renderApp(
    <>
      <JobsPage />
      <Toasts />
    </>,
    { path: '/jobs' },
  );
  return calls;
}

describe('bulk actions on Jobs', () => {
  it('picks a range with shift, marks it not interested, and Undo puts each status back', async () => {
    const calls = stub();
    const table = await screen.findByRole('table');
    await userEvent.click(within(table).getByLabelText('Select Role One at Acme'));
    fireEvent.click(within(table).getByLabelText('Select Role Three at Globex'), { shiftKey: true });
    const bar = screen.getByRole('toolbar', { name: 'Selected jobs' });
    expect(within(bar).getByText('3 selected')).toBeInTheDocument();
    await userEvent.click(within(bar).getByRole('button', { name: /Not interested/ }));
    await waitFor(() => expect(calls.filter((c) => c.startsWith('PUT')).sort()).toEqual(['PUT 501 not_interested', 'PUT 502 not_interested', 'PUT 503 not_interested']));
    expect(screen.queryByRole('toolbar', { name: 'Selected jobs' })).toBeNull();
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(calls).toEqual(expect.arrayContaining(['DELETE 501', 'PUT 502 saved', 'DELETE 503'])));
  });

  it('selects from the keyboard and hides each company once, with Undo', async () => {
    const calls = stub();
    await screen.findByRole('table');
    await userEvent.keyboard('x'); // the cursor starts on the first row
    await userEvent.keyboard('jx');
    await userEvent.keyboard('jx');
    const bar = screen.getByRole('toolbar', { name: 'Selected jobs' });
    expect(within(bar).getByText('3 selected')).toBeInTheDocument();
    await userEvent.click(within(bar).getByRole('button', { name: 'Hide 2 companies' }));
    await waitFor(() => expect(calls.sort()).toEqual(['hide 11', 'hide 12']));
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(calls).toEqual(expect.arrayContaining(['unhide 11', 'unhide 12'])));
  });

  it('selects every job on the page, and clears', async () => {
    stub();
    const table = await screen.findByRole('table');
    await userEvent.click(within(table).getByLabelText('Select every job on this page'));
    expect(screen.getByText('3 selected')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear the selection' }));
    expect(screen.queryByRole('toolbar', { name: 'Selected jobs' })).toBeNull();
  });
});
