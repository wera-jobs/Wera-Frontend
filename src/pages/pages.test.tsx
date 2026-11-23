// Page-level tests: each page renders real API fixtures and its main
// interaction works. Network calls go to stubApi (src/test/fixtures.ts).
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { fixtures, stubApi } from '../test/fixtures';
import { jsonResponse, renderApp, jsonBody } from '../test/render';
import IndustriesPage from './IndustriesPage';
import IndustryPage from './IndustryPage';
import JobsPage from './JobsPage';
import ProfilePage from './ProfilePage';
import TodayPage from './TodayPage';
import TrackerPage from './TrackerPage';

const firstToday = fixtures.today.jobs[0];

describe('a failed refresh', () => {
  it('leaves what the page already shows on screen', async () => {
    let up = true;
    stubApi({ 'GET /api/jobs': () => (up ? fixtures.jobs : jsonResponse(502, { error: 'bad gateway' })) });
    const { client } = renderApp(<JobsPage />);
    const [title] = await screen.findAllByText(fixtures.jobs.jobs[0].title);
    up = false;
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['jobs'] });
      await new Promise((done) => setTimeout(done, 50));
    });
    expect(client.getQueriesData({ queryKey: ['jobs'] })).not.toHaveLength(0);
    expect(title).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('shows the error when there is nothing to show', async () => {
    stubApi({ 'GET /api/jobs': () => jsonResponse(502, { error: 'bad gateway' }) });
    renderApp(<JobsPage />);
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
  });
});

describe('TodayPage', () => {
  it('lists the review queue with the top pick first', async () => {
    stubApi();
    renderApp(<TodayPage />);
    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument();
    expect((await screen.findAllByText(firstToday.title)).length).toBeGreaterThan(0);
    expect(screen.getByText(/matches to review/)).toBeInTheDocument();
  });

  it('shows grading progress while the AI grades a new user\'s matches', async () => {
    const estimated = fixtures.today.jobs.slice(0, 3).map((j) => ({ ...j, fit_score: null, estimated_score: 70 }));
    stubApi({ 'GET /api/today': () => ({ count: 3, jobs: estimated, pending: 120, ungraded: 80 }) });
    renderApp(<TodayPage />);
    expect(await screen.findByText('The AI is grading your matches')).toBeInTheDocument();
    expect(screen.getByText(/80 to go/)).toBeInTheDocument();
    expect(screen.getByText(/\(3 estimated\)/)).toBeInTheDocument();
  });

  it('shows no progress once every match is graded, though some wait for a full score', async () => {
    const estimated = fixtures.today.jobs.slice(0, 3).map((j) => ({ ...j, fit_score: null, estimated_score: 70, estimate_ai: true }));
    stubApi({ 'GET /api/today': () => ({ count: 3, jobs: estimated, pending: 120, ungraded: 0 }) });
    renderApp(<TodayPage />);
    expect(await screen.findByText(/\(3 estimated\)/)).toBeInTheDocument();
    expect(screen.queryByText('The AI is grading your matches')).toBeNull();
    expect(screen.getAllByLabelText(/Estimated fit 70/)[0]).toHaveAttribute('title', expect.stringContaining('quick AI grade'));
  });
});

describe('JobsPage', () => {
  it('lists jobs and opens one in the job view', async () => {
    stubApi();
    renderApp(<JobsPage />, { path: '/jobs', route: '/jobs' });
    const first = fixtures.jobs.jobs[0];
    await userEvent.click((await screen.findAllByText(first.title))[0]);
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByRole('heading', { name: first.title })).toBeInTheDocument();
  });

  it('opens the job view from the URL and switches to the cover letter', async () => {
    stubApi();
    renderApp(<JobsPage />, { path: `/jobs?job=${fixtures.job.id}`, route: '/jobs' });
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText(fixtures.job.title)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: /Cover letter/ }));
    expect(await within(dialog).findByRole('button', { name: /Write my letter/ })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('tab', { name: 'The posting' }));
    expect(within(dialog).queryByRole('button', { name: /Write my letter/ })).toBeNull();
  });

  it('saves a status from the job view', async () => {
    let saved: unknown;
    stubApi({
      [`PUT /api/jobs/${fixtures.job.id}/application`]: (init) => {
        saved = jsonBody(init);
        return { ...fixtures.job, application_status: 'applied' };
      },
    });
    renderApp(<JobsPage />, { path: `/jobs?job=${fixtures.job.id}`, route: '/jobs' });
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText(fixtures.job.title);
    await userEvent.selectOptions(within(dialog).getByRole('combobox'), 'applied');
    await waitFor(() => expect(saved).toMatchObject({ status: 'applied' }));
  });
});

describe('JobsPage keyboard', () => {
  it('j and k move the selection; Enter opens the job', async () => {
    stubApi();
    renderApp(<JobsPage />, { path: '/jobs', route: '/jobs' });
    const first = fixtures.jobs.jobs[0];
    await screen.findAllByText(first.title);
    // Real keydown events on window, as the page listens there.
    fireEvent.keyDown(window, { key: 'j' });
    fireEvent.keyDown(window, { key: 'j' });
    fireEvent.keyDown(window, { key: 'k' });
    fireEvent.keyDown(window, { key: 'Enter' });
    // j, j, k lands on the second job.
    const second = fixtures.jobs.jobs[1];
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByRole('heading', { name: second.title })).toBeInTheDocument();
  });
});

describe('other pages', () => {
  it('Tracker groups applications by status', async () => {
    stubApi();
    renderApp(<TrackerPage />);
    expect(await screen.findByRole('heading', { name: 'Tracker' })).toBeInTheDocument();
  });

  it('Tracker cards can be dragged, and a moved card changes column at once', async () => {
    const saved = { ...fixtures.jobs.jobs[0], application_status: 'saved' as const };
    const sent: unknown[] = [];
    stubApi({
      // Each column asks for its own status; only Saved holds a job.
      'GET /api/jobs': (_init, url) => {
        const jobs = url.searchParams.get('status') === 'saved' ? [saved] : [];
        return { ...fixtures.jobs, total: jobs.length, jobs };
      },
      // The save never returns, so what the board shows is the optimistic move.
      [`PUT /api/jobs/${saved.id}/application`]: (init) => {
        sent.push(jsonBody(init));
        return new Promise<never>(() => {});
      },
    });
    renderApp(<TrackerPage />);
    const savedCol = await screen.findByRole('region', { name: 'Saved' });
    const card = await within(savedCol).findByText(saved.title);
    expect(card.closest('[aria-roledescription="draggable job"]')).not.toBeNull();

    await userEvent.selectOptions(within(savedCol).getByLabelText(`Status for ${saved.title}`), 'applied');
    expect(await within(screen.getByRole('region', { name: 'Applied' })).findByText(saved.title)).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Saved' })).queryByText(saved.title)).toBeNull();
    // Only the status: the application's notes stay as they are (an empty "notes" would erase them).
    expect(sent).toEqual([{ id: saved.id, status: 'applied' }]);
  });

  it('Tracker search narrows every stage, and a phone gets one stage at a time as tabs', async () => {
    const two = [
      { ...fixtures.jobs.jobs[0], id: 901, title: 'Platform Engineer', company: 'Acme', application_status: 'saved' as const },
      { ...fixtures.jobs.jobs[0], id: 902, title: 'Data Analyst', company: 'Globex', application_status: 'saved' as const },
    ];
    stubApi({
      'GET /api/jobs': (_init, url) => {
        const jobs = url.searchParams.get('status') === 'saved' ? two : [];
        return { ...fixtures.jobs, total: jobs.length, jobs };
      },
    });
    renderApp(<TrackerPage />);
    const savedCol = await screen.findByRole('region', { name: 'Saved' });
    await within(savedCol).findByText('Platform Engineer');
    // Tabs (shown on phones) carry each stage's count; Saved is the one open.
    const tabs = screen.getByRole('tablist', { name: 'Stages' });
    expect(within(tabs).getByRole('tab', { name: /Saved 2/ })).toHaveAttribute('aria-selected', 'true');
    // Only the open stage is shown on a phone; the others wait behind their tabs.
    expect(screen.getByRole('region', { name: 'Applied' })).toHaveClass('hidden');
    await userEvent.click(within(tabs).getByRole('tab', { name: /Applied/ }));
    expect(screen.getByRole('region', { name: 'Applied' })).not.toHaveClass('hidden');

    await userEvent.type(screen.getByLabelText('Search the tracker'), 'globex');
    expect(within(savedCol).queryByText('Platform Engineer')).toBeNull();
    expect(within(savedCol).getByText('Data Analyst')).toBeInTheDocument();
    expect(within(tabs).getByRole('tab', { name: /Saved 1/ })).toBeInTheDocument();
  });

  it('Industries shows each industry with its matches', async () => {
    stubApi();
    renderApp(<IndustriesPage />);
    expect(await screen.findByText('Trading & HFT')).toBeInTheDocument();
    expect(screen.getByText('AI & Machine Learning')).toBeInTheDocument();
  });

  it('an industry page lists its jobs', async () => {
    stubApi();
    renderApp(<IndustryPage />, { path: '/industries/trading', route: '/industries/:id' });
    expect(await screen.findByRole('heading', { name: 'Trading & HFT' })).toBeInTheDocument();
  });


  it('Profile: Discard puts the form back to what is saved', async () => {
    stubApi();
    renderApp(<ProfilePage />);
    const text = await screen.findByLabelText('Profile text');
    const saved = (text as HTMLTextAreaElement).value;
    await userEvent.type(text, ' and more');
    expect(await screen.findByText('You have unsaved changes.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(text).toHaveValue(saved);
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
  });

  it('Profile: text over the limit cannot be saved, and says by how much', async () => {
    stubApi();
    renderApp(<ProfilePage />);
    const text = await screen.findByLabelText('Profile text');
    fireEvent.change(text, { target: { value: 'x'.repeat(12_050) } });
    expect(await screen.findByText(/50 characters over the limit/)).toBeInTheDocument();
    expect(screen.getByText(/too long to save/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('Profile: the text jobs are scored against comes right after what the user wants', async () => {
    stubApi();
    renderApp(<ProfilePage />);
    await screen.findByLabelText('Profile text');
    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titles.slice(0, 4)).toEqual(['What you want', 'Profile text', 'Application details', 'Saved answers']);
    expect(within(screen.getByRole('navigation', { name: 'On this page' })).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['#want', '#text', '#application', '#answers']);
  });

  it('Profile shows the photo controls and the resume', async () => {
    stubApi();
    renderApp(<ProfilePage />);
    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add photo' })).toBeInTheDocument();
    expect(await screen.findByText('resume.pdf')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Show the text Wera read/ }));
    expect(screen.getByText(/SRE intern/, { selector: 'pre' })).toBeInTheDocument();
  });
});

describe('Tracker cards', () => {
  it('open with Enter and with Space', async () => {
    const saved = { ...fixtures.jobs.jobs[0], application_status: 'saved' as const };
    stubApi({
      'GET /api/jobs': (_init, url) => {
        const jobs = url.searchParams.get('status') === 'saved' ? [saved] : [];
        return { ...fixtures.jobs, total: jobs.length, jobs };
      },
    });
    renderApp(<TrackerPage />, { path: '/tracker' });
    for (const key of ['{Enter}', ' ']) {
      const [card] = await screen.findAllByRole('button', { name: `${saved.title} at ${saved.company}` });
      card.focus();
      await userEvent.keyboard(key);
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    }
  });
});

describe('Tracker list view', () => {
  it('shows and hides not-interested jobs without crashing', async () => {
    const saved = { ...fixtures.jobs.jobs[0], application_status: 'saved' as const };
    const passed = { ...fixtures.jobs.jobs[1], application_status: 'not_interested' as const };
    stubApi({
      'GET /api/jobs': (_init, url) => {
        const status = url.searchParams.get('status');
        const jobs = status === 'saved' ? [saved] : status === 'not_interested' ? [passed] : [];
        return { ...fixtures.jobs, total: jobs.length, jobs };
      },
    });
    renderApp(<TrackerPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'List' }));
    const table = await screen.findByRole('table');
    expect(within(table).getByText(saved.title)).toBeInTheDocument();
    expect(within(table).queryByText(passed.title)).not.toBeInTheDocument();

    const toggle = screen.getByRole('checkbox', { name: /Show not interested/ });
    await userEvent.click(toggle);
    expect(await within(await screen.findByRole('table')).findByText(passed.title)).toBeInTheDocument();
    await userEvent.click(toggle);
    await waitFor(() => expect(within(screen.getByRole('table')).queryByText(passed.title)).not.toBeInTheDocument());
    expect(within(screen.getByRole('table')).getByText(saved.title)).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });
});
