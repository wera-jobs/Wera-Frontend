import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { stubApi } from '../test/fixtures';
import { renderApp } from '../test/render';
import { Progress } from './Progress';

const week = (i: number) => new Date(Date.UTC(2026, 8, 7 + 7 * i)).toISOString();

describe('progress', () => {
  it('shows the funnel, the weeks and the systems as the API counts them', async () => {
    stubApi({
      'GET /api/analytics/applications': () => ({
        now: { applied: 6, interviewing: 2, offer: 1, rejected: 1 },
        reached: { applied: 10, interviewing: 3, offer: 1 },
        weeks: Array.from({ length: 12 }, (_, i) => ({ week: week(i), applied: i === 11 ? 4 : i === 10 ? 6 : 0, responded: i === 10 ? 3 : 0, interview: i === 10 ? 2 : 0 })),
        sources: [
          { source: 'greenhouse', applied: 7, responded: 3, interview: 2 },
          { source: 'workday', applied: 3, responded: 1, interview: 1 },
        ],
        days_to_interview: 8.5,
        days_to_offer: 21,
      }),
    });
    renderApp(<Progress />);
    expect(await screen.findByRole('img', { name: 'Interviewing: 3' })).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument(); // heard back: 4 of 10
    expect(screen.getByText('8.5d')).toBeInTheDocument();
    expect(screen.getByText('21d')).toBeInTheDocument();
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows.map((r) => r.textContent)).toEqual(['Greenhouse73 43%2', 'Workday31 33%1']);
    const bars = screen.getAllByRole('button', { name: /^Week of / });
    expect(bars).toHaveLength(12);
    fireEvent.mouseEnter(bars[10]);
    expect(screen.getByText(/6 sent, 3 heard back, 2 interviews/)).toBeInTheDocument();
  });

  it('explains what fills it when nothing has been applied to', async () => {
    stubApi();
    renderApp(<Progress />);
    expect(await screen.findByText('No applications yet')).toBeInTheDocument();
  });

  it('labels each week by its own date, in any time zone', async () => {
    stubApi({
      'GET /api/analytics/applications': () => ({
        now: { applied: 1, interviewing: 0, offer: 0, rejected: 0 },
        reached: { applied: 1, interviewing: 0, offer: 0 },
        weeks: [{ week: '2026-09-07', applied: 1, responded: 0, interview: 0 }],
        sources: [], days_to_interview: null, days_to_offer: null,
      }),
    });
    renderApp(<Progress />);
    // Sep 7 at UTC midnight is Sep 6 in the Americas unless read as UTC.
    expect(await screen.findByRole('button', { name: /^Week of Sep 7:/ })).toBeInTheDocument();
  });
});
