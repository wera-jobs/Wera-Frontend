import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { filterQuery } from '../lib/searches';
import { stubApi } from '../test/fixtures';
import { jsonBody, renderApp } from '../test/render';
import { SavedSearchBar, SidebarSearches } from './SavedSearches';

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}</div>;
}

const page = (
  <Routes>
    <Route path="*" element={<><SavedSearchBar /><SidebarSearches /><Where /></>} />
  </Routes>
);

describe('saved searches', () => {
  it('keeps only the filters, sorted', () => {
    expect(filterQuery('?work_mode=remote&job=4&q=data&offset=50')).toBe('q=data&work_mode=remote');
  });

  it('saves the current filters under a name, and reopens and deletes saved ones', async () => {
    let searches = [{ id: 1, name: 'Sponsors', query: 'sponsorship=yes', created_at: '2026-11-19T00:00:00Z' }];
    const sent: unknown[] = [];
    stubApi({
      'GET /api/searches': () => ({ searches }),
      'POST /api/searches': (init) => {
        sent.push(jsonBody(init));
        searches = [...searches, { id: 2, name: 'Remote data', query: 'q=data&work_mode=remote', created_at: '2026-11-19T00:00:00Z' }];
        return searches[1];
      },
      'DELETE /api/searches/1': () => {
        searches = searches.filter((s) => s.id !== 1);
        return undefined;
      },
    });
    renderApp(page, { path: '/jobs?work_mode=remote&q=data&job=7' });
    await userEvent.click(await screen.findByRole('button', { name: 'Save this search' }));
    await userEvent.type(screen.getByLabelText('Name for this search'), 'Remote data{Enter}');
    await waitFor(() => expect(sent).toEqual([{ name: 'Remote data', query: 'q=data&work_mode=remote' }]));
    // Saved: it shows as the current one, and isn't offered again.
    const bar = screen.getByRole('group', { name: 'Saved searches' });
    expect(await within(bar).findByRole('link', { name: 'Remote data' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save this search' })).toBeNull();

    await userEvent.click(within(bar).getByRole('link', { name: 'Sponsors' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/jobs?sponsorship=yes');
    await userEvent.click(within(bar).getByRole('button', { name: 'Delete saved search Sponsors' }));
    await waitFor(() => expect(within(bar).queryByRole('link', { name: 'Sponsors' })).toBeNull());
  });

  it('offers nothing with no filters and nothing saved', async () => {
    stubApi();
    renderApp(page, { path: '/jobs' });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('button', { name: 'Save this search' })).toBeNull();
    expect(screen.queryByText('Saved searches')).toBeNull();
  });
});
