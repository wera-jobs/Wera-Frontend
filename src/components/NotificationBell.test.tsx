import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { stubApi } from '../test/fixtures';
import { jsonBody, renderApp } from '../test/render';
import { NotificationBell } from './NotificationBell';

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}</div>;
}

const items = [
  { id: 1, kind: 'reminder', job_id: 42, title: 'Onsite', body: 'Engineer at Acme', at: '2026-12-01T15:00:00Z', created_at: new Date().toISOString(), read_at: null },
  { id: 2, kind: 'strong_matches', job_id: 7, title: '3 new strong matches', body: 'Best: Data Scientist at Globex', at: null, created_at: new Date().toISOString(), read_at: null },
  { id: 3, kind: 'posting_closed', job_id: 9, title: "A posting you're tracking closed", body: 'Analyst at Initech', at: null, created_at: new Date().toISOString(), read_at: '2026-11-18T00:00:00Z' },
];

describe('notifications', () => {
  it('counts unread, opens a notice at its job and marks it read, and marks all read', async () => {
    const reads: unknown[] = [];
    stubApi({
      'GET /api/notifications': () => ({ notifications: items, unread: 2 }),
      'POST /api/notifications/read': (init) => {
        reads.push(jsonBody(init));
        return undefined;
      },
    });
    renderApp(
      <Routes>
        <Route path="*" element={<><NotificationBell /><Where /></>} />
      </Routes>,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications, 2 unread' }));
    const panel = screen.getByRole('dialog', { name: 'Notifications' });
    expect(within(panel).getAllByLabelText('Unread')).toHaveLength(2);
    expect(within(panel).getByText('Engineer at Acme')).toBeInTheDocument();

    await userEvent.click(within(panel).getByRole('button', { name: /Onsite/ }));
    await waitFor(() => expect(reads).toContainEqual({ ids: [1] }));
    expect(screen.getByTestId('where')).toHaveTextContent('/jobs?job=42');

    await userEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Mark all read' }));
    await waitFor(() => expect(reads).toContainEqual({ ids: [] }));
  });

  it('says what will show up when there is nothing', async () => {
    stubApi();
    renderApp(<NotificationBell />);
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }));
    expect(screen.getByText(/Nothing yet/)).toBeInTheDocument();
  });
});
