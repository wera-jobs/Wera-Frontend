// A list or chart that fails to load says so with a Retry, instead of a
// skeleton that never ends or an empty state that is not true.
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { profile, stubApi } from '../test/fixtures';
import { jsonResponse, renderApp } from '../test/render';
import IndustriesPage from '../pages/IndustriesPage';
import { PreferencesFields } from '../profile/PreferencesFields';
import { Progress } from './Progress';
import { ArchivedList, TrackerList } from './TrackerExtras';

const down = () => jsonResponse(500, { error: 'database busy' });

describe('views when loading fails', () => {
  it('progress: an error with Retry, not a skeleton', async () => {
    let up = false;
    stubApi({
      'GET /api/analytics/applications': () =>
        up ? { now: {}, reached: { applied: 0, interviewing: 0, offer: 0 }, weeks: [], sources: [], days_to_interview: null, days_to_offer: null } : down(),
    });
    renderApp(<Progress />);
    expect(await screen.findByText('database busy')).toBeInTheDocument();
    up = true;
    await userEvent.click(screen.getByRole('button', { name: /Retry/ }));
    expect(await screen.findByText('No applications yet')).toBeInTheDocument();
  });

  it('preferences: an error with Retry when the options fail', async () => {
    stubApi({ 'GET /api/profile/options': down });
    renderApp(<PreferencesFields prefs={profile.preferences} answers={profile.answers} onPrefs={() => {}} onAnswers={() => {}} />);
    expect(await screen.findByText('database busy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
  });

  it('tracker list: an error, not "No applications match"', async () => {
    stubApi({ 'GET /api/jobs': down });
    renderApp(<TrackerList statuses={['saved', 'applied']} matches={() => true} onOpen={() => {}} onStatus={() => {}} />);
    expect(await screen.findByText('database busy')).toBeInTheDocument();
    expect(screen.queryByText('No applications match.')).toBeNull();
  });

  it('archived list: an error, not "Nothing archived"', async () => {
    stubApi({ 'GET /api/jobs': down });
    renderApp(<ArchivedList matches={() => true} onOpen={() => {}} onStatus={() => {}} />);
    expect(await screen.findByText('database busy')).toBeInTheDocument();
    expect(screen.queryByText(/Nothing archived/)).toBeNull();
  });

  it('a network failure reads as words, not "TypeError: Failed to fetch"', async () => {
    stubApi({ 'GET /api/industries': () => Promise.reject(new TypeError('Failed to fetch')) });
    renderApp(<IndustriesPage />);
    expect(await screen.findByText('Network error')).toBeInTheDocument();
    expect(screen.queryByText(/TypeError/)).toBeNull();
  });
});
