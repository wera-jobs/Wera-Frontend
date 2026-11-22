import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { fixtures, stubApi } from '../test/fixtures';
import { jsonBody, renderApp } from '../test/render';
import { Toasts } from '../lib/toast';
import TrackerPage from './TrackerPage';

const base = fixtures.jobs.jobs[0];
const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

describe('tracker data', () => {
  it('lists every application with the soonest next step first, and the archive on its own', async () => {
    const tracked = [
      { ...base, id: 701, title: 'Later Role', company: 'Acme', application_status: 'applied' as const, next_step: 'Follow up', next_step_at: day(5), resume_used: { kind: 'tailored' as const, name: 'Ada.pdf', letter: true, by: 'extension' as const } },
      { ...base, id: 702, title: 'Sooner Role', company: 'Globex', application_status: 'interviewing' as const, next_step: 'Send the take-home', next_step_at: day(1) },
      { ...base, id: 703, title: 'No Step Role', company: 'Initech', application_status: 'saved' as const },
    ];
    const archived = { ...base, id: 704, title: 'Old Role', company: 'Hooli', application_status: 'rejected' as const, archived_at: day(-3) };
    stubApi({
      'GET /api/jobs': (_init, url) => {
        if (url.searchParams.get('archived') === '1') return { ...fixtures.jobs, total: 1, jobs: [archived] };
        const jobs = tracked.filter((j) => j.application_status === url.searchParams.get('status'));
        return { ...fixtures.jobs, total: jobs.length, jobs };
      },
      'GET /api/events': () => ({
        events: [{ id: 1, job_id: 702, at: day(2), kind: 'onsite', with: 'The team', notes: '', title: 'Sooner Role', company: 'Globex' }],
      }),
    });
    renderApp(<TrackerPage />);
    // What's coming up sits above the board.
    await within(await screen.findByRole('region', { name: 'Applied' })).findByText('Later Role');
    const soon = await screen.findByRole('region', { name: 'Coming up' });
    expect(within(soon).getByRole('button')).toHaveTextContent(/^Onsite · Globex · /);
    // The board shows the next step on the card.
    const applied = await screen.findByRole('region', { name: 'Applied' });
    expect(await within(applied).findByText(/Follow up/)).toBeInTheDocument();

    const views = screen.getByRole('group', { name: 'View' });
    await userEvent.click(within(views).getByRole('button', { name: 'List' }));
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getAllByRole('button')[0].textContent)).toEqual([
      'Sooner RoleGGlobex',
      'Later RoleAAcme',
      'No Step RoleIInitech',
    ]);
    expect(screen.getByRole('region', { name: 'Applied' })).toHaveClass('hidden');
    expect(screen.getByText('Tailored for this job + letter')).toBeInTheDocument();

    await userEvent.click(within(views).getByRole('button', { name: 'Archived' }));
    expect(await screen.findByText('Old Role')).toBeInTheDocument();
    expect(screen.queryByText('Sooner Role', { selector: 'span' })).toBeNull();
  });

  it('saves the next step, contact and an interview from the job view, and archives', async () => {
    const job = { ...base, id: 801, title: 'Tracked Role', company: 'Acme', application_status: 'applied' as const };
    const patched: unknown[] = [];
    const added: unknown[] = [];
    stubApi({
      'GET /api/jobs': (_init, url) => {
        const jobs = url.searchParams.get('status') === 'applied' ? [job] : [];
        return { ...fixtures.jobs, total: jobs.length, jobs };
      },
      [`GET /api/jobs/${job.id}`]: () => ({ ...fixtures.job, ...job, description: 'About the role', deep: null }),
      [`GET /api/jobs/${job.id}/cover-letter`]: () => new Response('{"error":"none"}', { status: 404 }),
      [`GET /api/jobs/${job.id}/events`]: () => ({ events: [] }),
      [`PATCH /api/jobs/${job.id}/application`]: (init) => {
        patched.push(jsonBody(init));
        return { ...fixtures.job, ...job, description: 'About the role', deep: null };
      },
      [`POST /api/jobs/${job.id}/events`]: (init) => {
        added.push(jsonBody(init));
        return { id: 9, job_id: job.id, at: day(3), kind: 'interview', with: 'Sam', notes: '' };
      },
    });
    renderApp(<TrackerPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Tracked Role at Acme' }));
    const dialog = await screen.findByRole('dialog');

    await userEvent.type(within(dialog).getByLabelText('Next step'), 'Email the recruiter{Enter}');
    await waitFor(() => expect(patched).toContainEqual({ next_step: 'Email the recruiter' }));

    await userEvent.type(within(dialog).getByLabelText('Contact name'), 'Sam');
    await userEvent.click(within(dialog).getByLabelText('Contact role'));
    await waitFor(() => expect(patched).toContainEqual({ contact: { name: 'Sam', role: '', link: '' } }));

    await userEvent.click(within(dialog).getByRole('button', { name: 'Add' }));
    await userEvent.type(within(dialog).getByLabelText('When'), '2026-12-01T15:00');
    await userEvent.type(within(dialog).getByLabelText('With whom'), 'Sam');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(added).toHaveLength(1));
    expect(added[0]).toMatchObject({ kind: 'interview', with: 'Sam', at: new Date('2026-12-01T15:00').toISOString() });

    await userEvent.selectOptions(within(dialog).getByLabelText(/Sent with it/), 'tailored');
    await waitFor(() => expect(patched).toContainEqual({ resume_kind: 'tailored' }));
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Cover letter' }));
    await waitFor(() => expect(patched).toContainEqual({ letter_sent: true }));

    await userEvent.click(within(dialog).getByRole('button', { name: 'Archive' }));
    await waitFor(() => expect(patched).toContainEqual({ archived: true }));
  });

  it('offers interview prep in one click when a job moves to Interviewing', async () => {
    const job = { ...base, id: 802, title: 'Prep Role', company: 'Globex', application_status: 'applied' as const };
    let status: string = 'applied';
    stubApi({
      'GET /api/jobs': (_init, url) => {
        const jobs = url.searchParams.get('status') === status ? [{ ...job, application_status: status }] : [];
        return { ...fixtures.jobs, total: jobs.length, jobs };
      },
      [`GET /api/jobs/${job.id}`]: () => ({ ...fixtures.job, ...job, application_status: status, description: 'About the role', deep: null }),
      [`GET /api/jobs/${job.id}/cover-letter`]: () => new Response('{"error":"none"}', { status: 404 }),
      [`GET /api/jobs/${job.id}/interview-prep`]: () => new Response('{"error":"none"}', { status: 404 }),
      [`GET /api/jobs/${job.id}/events`]: () => ({ events: [] }),
      [`PUT /api/jobs/${job.id}/application`]: (init) => {
        status = jsonBody<{ status: string }>(init).status;
        return { ...fixtures.job, ...job, application_status: status, description: 'About the role', deep: null };
      },
    });
    renderApp(
      <>
        <TrackerPage />
        <Toasts />
      </>,
    );
    await userEvent.selectOptions(await screen.findByLabelText('Status for Prep Role'), 'interviewing');
    await userEvent.click(await screen.findByRole('button', { name: 'Prepare for it' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('tab', { name: 'Interview prep' })).toHaveAttribute('aria-selected', 'true');
    expect(await within(dialog).findByRole('button', { name: /Prepare for this interview/ })).toBeInTheDocument();
  });
});
