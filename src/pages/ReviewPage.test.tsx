import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { stubApi } from '../test/fixtures';
import { renderApp } from '../test/render';
import ReviewPage from './ReviewPage';

const review = (week: string) => ({
  week,
  applied: [{ job_id: 1, title: 'SRE', company: 'Acme', status: 'interviewing' }, { job_id: 2, title: 'Data Engineer', company: 'Globex', status: 'applied' }],
  applied_prev: 5,
  replies: [{ job_id: 1, title: 'SRE', company: 'Acme', status: 'interviewing' }],
  strong_new: 4,
  strong_acted: 1,
  strong_best: { job_id: 9, title: 'Platform Engineer', company: 'Initech', score: 91 },
  waiting: 3,
  old_applied: 0,
  gaps: [{ skill: 'Kubernetes', count: 4 }],
  gaps_of: 6,
  suggestions: [{ text: "3 of this week's 4 strong matches are still waiting for you; the best is Platform Engineer at Initech.", link: '/jobs?job=9' }],
});

describe('your week', () => {
  it('shows what was sent, what replied, what to try and what jobs wanted, and steps back a week', async () => {
    const asked: string[] = [];
    stubApi({
      'GET /api/review/weekly': (_init, url) => {
        asked.push(url.searchParams.get('week') ?? '');
        return review(asked.length === 1 ? '2026-11-16T00:00:00Z' : '2026-11-09T00:00:00Z');
      },
    });
    renderApp(<ReviewPage />);
    expect(await screen.findByText(/Nov 16 to Nov 22/)).toBeInTheDocument();
    expect(screen.getByText('3 fewer than the week before')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /strong matches are still waiting/ })).toHaveAttribute('href', '/jobs?job=9');
    const replies = screen.getByRole('region', { name: 'Replies' });
    expect(within(replies).getByText('Interview')).toBeInTheDocument();
    expect(screen.getByText(/in the 6 applications of the last month/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'The week before' }));
    await waitFor(() => expect(asked[1]).toBe('2026-11-09'));
  });
});
