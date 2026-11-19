import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { JobCard } from '../components/JobCard';
import type { Job } from '../api/types';
import { fixtures, stubApi } from '../test/fixtures';
import { renderApp } from '../test/render';
import CompanyPage from './CompanyPage';

const match = { ...fixtures.jobs.jobs[0], id: 61, title: 'Platform Engineer', company: 'Acme', company_id: 5 } as Job;
const page = {
  id: 5, name: 'Acme', industry: 'ai_ml', ats: 'greenhouse', hidden: false, followed: false, open_jobs: 2,
  matches: [match],
  roles: [
    { id: 61, title: 'Platform Engineer', location: 'Remote, US', url: 'https://example.com/61', posted_at: null, first_seen_at: '2026-11-18T00:00:00Z', match: true },
    { id: 62, title: 'Account Executive', location: 'Austin, TX', url: 'https://example.com/62', posted_at: null, first_seen_at: '2026-11-18T00:00:00Z', match: false },
  ],
  sponsorship: { yes: 1, unknown: 2 },
  h1b: null,
};

describe('company page', () => {
  it('shows matches, every open role and what postings say, and follows the company', async () => {
    const follows: string[] = [];
    stubApi({
      'GET /api/companies/5': () => ({ ...page, followed: follows.length > 0 }),
      'PUT /api/companies/5/follow': () => (follows.push('follow'), undefined),
    });
    renderApp(
      <Routes>
        <Route path="/companies/:id" element={<CompanyPage />} />
      </Routes>,
      { path: '/companies/5' },
    );
    expect(await screen.findByRole('heading', { name: 'Acme', level: 1 })).toBeInTheDocument();
    const roles = screen.getByRole('region', { name: 'All open roles' });
    expect(within(roles).getAllByRole('listitem')).toHaveLength(2);
    expect(within(roles).getByText('Match')).toBeInTheDocument();
    expect(within(roles).getByRole('link', { name: 'Open the posting for Account Executive' })).toHaveAttribute('href', 'https://example.com/62');
    expect(screen.getByText('of 3 postings scored for you')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'H-1B filings' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Follow' }));
    await waitFor(() => expect(follows).toEqual(['follow']));
    expect(screen.getByRole('button', { name: 'Following' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('is linked from every job card', async () => {
    stubApi();
    renderApp(<JobCard job={match} onOpen={() => {}} />);
    expect(await screen.findByRole('link', { name: 'Acme' })).toHaveAttribute('href', '/companies/5');
  });
});
