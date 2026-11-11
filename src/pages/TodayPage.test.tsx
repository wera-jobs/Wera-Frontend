import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ApplyCheck } from '../components/ApplyCheck';
import { Toasts } from '../lib/toast';
import { fixtures, stubApi } from '../test/fixtures';
import { jsonBody, renderApp } from '../test/render';
import TodayPage from './TodayPage';

const jobs = fixtures.today.jobs;
const top = jobs[0];
// The fixture's top pick, posted days ago whatever today's date: a posting up for months is not the top pick.
const freshTop = { ...top, posted_at: new Date(Date.now() - 3 * 86_400_000).toISOString() };
const freshJobs = [freshTop, ...jobs.slice(1)];
const freshToday = { 'GET /api/today': () => ({ ...fixtures.today, jobs: freshJobs }) };
const titles = () => screen.queryAllByRole('button', { name: / at / }).map((b) => b.getAttribute('aria-label'));

describe('Today', () => {
  it('shows the top pick and 20 more, then 20 at a time', async () => {
    stubApi(freshToday);
    renderApp(<TodayPage />);
    expect(await screen.findByRole('button', { name: `Top pick: ${top.title} at ${top.company}` })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(21);
    await userEvent.click(screen.getByRole('button', { name: 'Show 20 more' }));
    expect(screen.getAllByRole('article')).toHaveLength(41);
    await userEvent.click(screen.getByRole('button', { name: 'Show 9 more' }));
    expect(screen.getAllByRole('article')).toHaveLength(50);
    expect(screen.queryByRole('button', { name: /^Show \d+ more$/ })).toBeNull();
  });

  it('picks a fresh job over one up for months', async () => {
    const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
    const old = { ...top, posted_at: ago(100) };
    const fresh = { ...jobs[1], posted_at: ago(3) };
    stubApi({ 'GET /api/today': () => ({ ...fixtures.today, jobs: [old, fresh, ...jobs.slice(2)] }) });
    renderApp(<TodayPage />);
    expect(await screen.findByRole('button', { name: `Top pick: ${jobs[1].title} at ${jobs[1].company}` })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `${top.title} at ${top.company}` })).toBeInTheDocument();
  });

  it('filters to strong fits from their tile, and back', async () => {
    stubApi(freshToday);
    renderApp(<TodayPage />);
    const tile = await screen.findByRole('button', { name: /Strong fits \(80\+\)/ });
    await waitFor(() => expect(tile).toHaveTextContent('5'));
    await userEvent.click(tile);
    expect(tile).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('article')).toHaveLength(5);
    expect(screen.getByRole('status')).toHaveTextContent('Showing 5 strong fits (80+).');
    await userEvent.click(screen.getByRole('button', { name: 'Show all' }));
    expect(tile).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getAllByRole('article')).toHaveLength(21);
  });

  it('says so when a filter leaves nothing', async () => {
    stubApi(freshToday);
    renderApp(<TodayPage />);
    await userEvent.click(await screen.findByRole('button', { name: /Sponsor visas/ }));
    expect(screen.getByText('No job that sponsors visas to review right now.')).toBeInTheDocument();
  });

  it('links applied this week to the tracker', async () => {
    stubApi(freshToday);
    renderApp(<TodayPage />);
    expect(await screen.findByRole('link', { name: /Applied this week/ })).toHaveAttribute('href', '/tracker');
  });

  it('drops a dismissed job at once, and Undo brings it back', async () => {
    const sent: { method: string; body?: unknown }[] = [];
    let list = freshJobs;
    stubApi({ ...freshToday,
      'GET /api/today': () => ({ ...fixtures.today, jobs: list }),
      [`PUT /api/jobs/${top.id}/application`]: (init) => {
        sent.push({ method: 'PUT', body: jsonBody(init) });
        list = jobs.slice(1);
        return { ...top, application_status: 'not_interested' };
      },
      [`DELETE /api/jobs/${top.id}/application`]: () => {
        sent.push({ method: 'DELETE' });
        list = freshJobs;
        return { ...freshTop, application_status: null };
      },
    });
    renderApp(
      <>
        <TodayPage />
        <Toasts />
      </>,
    );
    const pick = await screen.findByRole('button', { name: `Top pick: ${top.title} at ${top.company}` });
    const card = pick.closest('article')!;
    await userEvent.click(within(card).getByRole('button', { name: /Not interested/ }));
    await waitFor(() => expect(titles()).not.toContain(`Top pick: ${top.title} at ${top.company}`));
    expect(sent[0]).toEqual({ method: 'PUT', body: { id: top.id, status: 'not_interested' } });
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(sent).toContainEqual({ method: 'DELETE' }));
    expect(await screen.findByRole('button', { name: `Top pick: ${top.title} at ${top.company}` })).toBeInTheDocument();
  });

  it('keeps browsing in the job view after the open job leaves the list', async () => {
    let list = freshJobs;
    stubApi({ ...freshToday,
      'GET /api/today': () => ({ ...fixtures.today, jobs: list }),
      [`PUT /api/jobs/${jobs[1].id}/application`]: () => {
        list = jobs.filter((j) => j.id !== jobs[1].id);
        return { ...jobs[1], application_status: 'applied' };
      },
    });
    renderApp(<TodayPage />);
    await userEvent.click(await screen.findByRole('button', { name: `${jobs[1].title} at ${jobs[1].company}` }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.selectOptions(await within(dialog).findByRole('combobox', { name: /status/i }), 'applied');
    await waitFor(() => expect(titles()).not.toContain(`${jobs[1].title} at ${jobs[1].company}`));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Next job' }));
    expect(await within(dialog).findByRole('heading', { name: jobs[2].title })).toBeInTheDocument();
  });
});

describe('Did you apply?', () => {
  const away = (ms: number) => {
    const now = Date.now();
    const real = Date.now;
    Date.now = () => now + ms;
    try {
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
    } finally {
      Date.now = real;
    }
  };

  it('asks after the user comes back from a posting, and marks it applied', async () => {
    const sent: unknown[] = [];
    stubApi({ ...freshToday,
      [`PUT /api/jobs/${top.id}/application`]: (init) => {
        sent.push(jsonBody(init));
        return { ...top, application_status: 'applied' };
      },
    });
    renderApp(
      <>
        <TodayPage />
        <ApplyCheck />
      </>,
    );
    const pick = await screen.findByRole('button', { name: `Top pick: ${top.title} at ${top.company}` });
    fireEvent.click(within(pick.closest('article')!).getByRole('link', { name: /Open posting/ }));
    away(60_000);
    const ask = await screen.findByRole('dialog', { name: 'Did you apply?' });
    expect(ask).toHaveTextContent(`${top.title} at ${top.company}`);
    await userEvent.click(within(ask).getByRole('button', { name: 'Yes, mark it applied' }));
    await waitFor(() => expect(sent).toContainEqual({ id: top.id, status: 'applied' }));
    expect(screen.queryByRole('dialog', { name: 'Did you apply?' })).toBeNull();
  });

  it('does not ask after a glance, or about a job already applied to', async () => {
    stubApi({ ...freshToday, [`GET /api/jobs/${top.id}`]: () => ({ ...fixtures.job, ...top, application_status: 'applied', deep: null }) });
    renderApp(
      <>
        <TodayPage />
        <ApplyCheck />
      </>,
    );
    const pick = await screen.findByRole('button', { name: `Top pick: ${top.title} at ${top.company}` });
    const link = within(pick.closest('article')!).getByRole('link', { name: /Open posting/ });
    fireEvent.click(link);
    away(5_000);
    expect(screen.queryByRole('dialog', { name: 'Did you apply?' })).toBeNull();
    fireEvent.click(link);
    away(60_000);
    await act(async () => new Promise((done) => setTimeout(done, 50)));
    expect(screen.queryByRole('dialog', { name: 'Did you apply?' })).toBeNull();
  });
});
