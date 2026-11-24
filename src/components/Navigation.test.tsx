// Getting around: the palette, links to company pages, notices, and the
// job view's company actions.
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { fixtures, stubApi } from '../test/fixtures';
import { renderApp } from '../test/render';
import { Toasts } from '../lib/toast';
import IndustryPage from '../pages/IndustryPage';
import { CommandPalette } from './CommandPalette';
import { JobDrawer } from './JobDrawer';
import { NotificationBell } from './NotificationBell';

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}</div>;
}
const withWhere = (ui: React.ReactNode) => (
  <Routes>
    <Route path="*" element={<>{ui}<Where /></>} />
  </Routes>
);

describe('command palette', () => {
  it('finds a company and opens its page', async () => {
    stubApi();
    renderApp(withWhere(<CommandPalette onClose={() => {}} />));
    await userEvent.type(screen.getByLabelText('Command palette input'), 'anyscale');
    await userEvent.click(await screen.findByRole('button', { name: /Anyscale/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/companies/8');
  });

  it('goes to the weekly review and the resume', () => {
    stubApi();
    renderApp(<CommandPalette onClose={() => {}} />);
    expect(screen.getByRole('button', { name: 'Weekly review' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'My resume' })).toBeInTheDocument();
  });

  it('keeps the highlighted item in view while the arrows move it', async () => {
    stubApi();
    renderApp(<CommandPalette onClose={() => {}} />);
    const input = screen.getByLabelText('Command palette input');
    const second = screen.getAllByRole('button')[1];
    const scroll = vi.fn();
    second.scrollIntoView = scroll;
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await waitFor(() => expect(scroll).toHaveBeenCalledWith({ block: 'nearest' }));
  });
});

describe('company links', () => {
  it("an industry's companies open their page in Wera", async () => {
    stubApi();
    renderApp(<IndustryPage />, { path: '/industries/trading', route: '/industries/:id' });
    await userEvent.click(await screen.findByRole('tab', { name: /Companies/ }));
    const cards = (await screen.findAllByRole('link', { name: /Old Mission/ })).filter((a) => a.textContent?.includes('open'));
    expect(cards.map((a) => a.getAttribute('href'))).toEqual(['/companies/24']);
  });
});

describe('notices', () => {
  it('a followed company with several new roles opens Jobs, not the tracker', async () => {
    const notice = { id: 5, kind: 'followed_company', job_id: null, title: 'Acme posted 3 roles', body: '', at: null, created_at: new Date().toISOString(), read_at: null };
    stubApi({ 'GET /api/notifications': () => ({ notifications: [notice], unread: 1 }), 'POST /api/notifications/read': () => undefined });
    renderApp(withWhere(<NotificationBell />));
    await userEvent.click(await screen.findByRole('button', { name: /Notifications/ }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Notifications' })).getByRole('button', { name: /Acme posted/ }));
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/jobs$/);
  });
});

describe('job view company actions', () => {
  const job = { ...fixtures.job, id: 801, company: 'Acme', company_id: 77, description: 'About it.' };

  it('hiding a company can be undone', async () => {
    const calls: string[] = [];
    stubApi({
      [`GET /api/jobs/${job.id}`]: () => job,
      'PUT /api/companies/77/hidden': () => (calls.push('hide'), undefined),
      'DELETE /api/companies/77/hidden': () => (calls.push('unhide'), undefined),
    });
    renderApp(<><JobDrawer jobId={job.id} onClose={() => {}} /><Toasts /></>);
    await userEvent.click(await screen.findByRole('button', { name: 'Hide Acme' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(calls).toEqual(['hide', 'unhide']));
  });

  it('a job you added has no Hide company button', async () => {
    stubApi({ [`GET /api/jobs/${job.id}`]: () => ({ ...job, source: 'manual' }) });
    renderApp(<JobDrawer jobId={job.id} onClose={() => {}} />);
    await screen.findByText('About it.');
    expect(screen.queryByRole('button', { name: 'Hide Acme' })).toBeNull();
  });

  it('the company link closes the view', async () => {
    stubApi({ [`GET /api/jobs/${job.id}`]: () => job });
    const onClose = vi.fn();
    renderApp(<JobDrawer jobId={job.id} onClose={onClose} />);
    await userEvent.click(await screen.findByRole('link', { name: 'Acme' }));
    expect(onClose).toHaveBeenCalled();
  });
});
