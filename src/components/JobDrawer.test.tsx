import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fixtures, stubApi } from '../test/fixtures';
import { jsonBody, renderApp } from '../test/render';
import { JobDrawer, type DrawerTab } from './JobDrawer';

const a = { ...fixtures.job, id: 701, title: 'Role A', company: 'Acme', description: 'About role A.' };
const b = { ...fixtures.job, id: 702, title: 'Role B', company: 'Globex', description: 'About role B.' };
const letter = (body: string) => ({ body, model: 'm', edited: false, created_at: '', updated_at: '' });

/** The drawer as the pages use it: Next and Previous step through a list. */
function Stepper({ ids, tab }: { ids: number[]; tab: DrawerTab }) {
  const [i, setI] = useState(0);
  return <JobDrawer jobId={ids[i]} initialTab={tab} onClose={() => {}} onNavigate={(d) => setI((n) => Math.min(Math.max(n + d, 0), ids.length - 1))} />;
}

describe('JobDrawer', () => {
  it("starts each job's cover letter fresh, so an open edit never saves to the next job", async () => {
    const puts: string[] = [];
    stubApi({
      [`GET /api/jobs/${a.id}`]: () => a,
      [`GET /api/jobs/${b.id}`]: () => b,
      [`GET /api/jobs/${a.id}/cover-letter`]: () => letter('Letter for Acme.'),
      [`GET /api/jobs/${b.id}/cover-letter`]: () => letter('Letter for Globex.'),
      [`PUT /api/jobs/${a.id}/cover-letter`]: (init) => (puts.push(`A: ${jsonBody<{ body: string }>(init).body}`), letter('x')),
      [`PUT /api/jobs/${b.id}/cover-letter`]: (init) => (puts.push(`B: ${jsonBody<{ body: string }>(init).body}`), letter('x')),
    });
    const { client } = renderApp(<Stepper ids={[a.id, b.id]} tab="letter" />);
    // Job B was opened before, so it shows at once with no loading state
    // in between (the case where the panel used to stay mounted).
    client.setQueryData(['job', b.id], b);

    expect(await screen.findByText('Letter for Acme.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Edit/ }));
    await userEvent.type(screen.getByLabelText('Cover letter'), ' A draft for Acme only.');

    await userEvent.click(screen.getByRole('button', { name: 'Next job' }));
    expect(await screen.findByText('Letter for Globex.')).toBeInTheDocument();
    // The editor closed with the job change; nothing to save into Globex.
    expect(screen.queryByLabelText('Cover letter')).toBeNull();
    expect(puts).toEqual([]);
  });

  it('keeps every tab when the posting has no description', async () => {
    const bare = { ...b, description: '' };
    stubApi({
      [`GET /api/jobs/${bare.id}`]: () => bare,
      // No letter yet: the panel offers to write one.
      [`GET /api/jobs/${bare.id}/cover-letter`]: () => new Response('{"error":"none"}', { status: 404 }),
    });
    renderApp(<JobDrawer jobId={bare.id} onClose={() => {}} />);

    expect(await screen.findByText(/didn't include a description/)).toBeInTheDocument();
    const tabs = screen.getByRole('tablist');
    for (const name of ['The posting', 'Cover letter', 'Resume', 'Interview prep']) {
      expect(within(tabs).getByRole('tab', { name })).toBeInTheDocument();
    }
    await userEvent.click(within(tabs).getByRole('tab', { name: 'Cover letter' }));
    await waitFor(() => expect(within(tabs).getByRole('tab', { name: 'Cover letter' })).toHaveAttribute('aria-selected', 'true'));
    expect(await screen.findByRole('button', { name: /Write my letter/ })).toBeInTheDocument();
  });
});
