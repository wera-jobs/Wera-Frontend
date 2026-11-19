import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { JobDetail } from '../api/types';
import { fixtures, stubApi } from '../test/fixtures';
import { jsonBody, jsonResponse, renderApp } from '../test/render';
import { EmailDrafts } from './EmailDrafts';

const job = { ...fixtures.job, id: 77, application_status: 'applied', contact: { name: 'Sam', role: 'Recruiter', link: 'sam@example.com' } } as unknown as JobDetail;

describe('email drafts', () => {
  it('drafts an email, says what the user could add, and opens it addressed to the contact', async () => {
    const sent: unknown[] = [];
    stubApi({
      'POST /api/jobs/77/email-draft': (init) => {
        sent.push(jsonBody(init));
        return { subject: 'Following up', body: 'Hello Sam,\n\nI applied two weeks ago and remain interested.\n\nAlex', needs: 'the team you spoke to' };
      },
    });
    renderApp(<EmailDrafts job={job} />);
    await userEvent.type(screen.getByLabelText('Anything the draft should say or stress'), 'Mention Go');
    await userEvent.click(screen.getByRole('button', { name: 'Follow-up' }));
    await waitFor(() => expect(sent).toEqual([{ kind: 'follow_up', request: 'Mention Go' }]));
    expect(await screen.findByLabelText('Email')).toHaveValue('Hello Sam,\n\nI applied two weeks ago and remain interested.\n\nAlex');
    expect(screen.getByText('the team you spoke to')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open in your mail app/ }).getAttribute('href')).toMatch(/^mailto:sam%40example.com\?subject=Following%20up&body=Hello%20Sam/);
  });

  it("says what to record first when the application isn't there yet", async () => {
    stubApi({ 'POST /api/jobs/77/email-draft': () => jsonResponse(409, { error: 'mark the job Offer first: this replies to an offer' }) });
    renderApp(<EmailDrafts job={job} />);
    await userEvent.click(screen.getByRole('button', { name: 'Offer reply' }));
    expect(await screen.findByText(/mark the job Offer first/)).toBeInTheDocument();
  });
});
