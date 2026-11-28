import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockApi, renderApp } from '../test/render';
import { EmailRepliesSettings, EmailSuggestions } from './EmailReplies';

const off = { available: true, address: null, setup: null };
const on = {
  available: true,
  address: 'u-abc123@in.example.com',
  setup: { created_at: '', last_email_at: null, confirm_code: '123456789', confirm_url: 'https://mail-settings.google.com/mail/vf-x', confirm_at: '' },
};

describe('EmailRepliesSettings', () => {
  it('turns forwarding on and shows the address and Gmail confirmation', async () => {
    let state: typeof off | typeof on = off;
    mockApi({
      'GET /api/inbound-address': () => state,
      'POST /api/inbound-address': () => (state = on),
      'DELETE /api/inbound-address': () => (state = off),
    });
    renderApp(<EmailRepliesSettings />);
    expect(await screen.findByText(/never the message/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Turn on email replies/ }));
    expect(await screen.findByText('u-abc123@in.example.com')).toBeInTheDocument();
    expect(screen.getByText('123456789')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Confirm in Gmail/ })).toHaveAttribute('href', 'https://mail-settings.google.com/mail/vf-x');

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await userEvent.click(screen.getByRole('button', { name: 'Turn off' }));
    expect(await screen.findByRole('button', { name: /Turn on email replies/ })).toBeInTheDocument();
  });

  it('says so when the server takes no mail', async () => {
    mockApi({ 'GET /api/inbound-address': () => ({ available: false, address: null, setup: null }) });
    renderApp(<EmailRepliesSettings />);
    expect(await screen.findByText(/not set up on this server/)).toBeInTheDocument();
  });
});

describe('EmailSuggestions', () => {
  it('changes the tracker only when the user accepts', async () => {
    const calls: string[] = [];
    let list = [
      { id: 7, job_id: 5, company: 'Acme', title: 'SRE', current_status: 'applied', kind: 'rejection', status: 'rejected', from_domain: 'greenhouse-mail.io', subject: 'Your application to Acme', received_at: '2026-11-27T10:00:00Z' },
      { id: 8, job_id: 6, company: 'Beta', title: 'Platform', current_status: 'applied', kind: 'interview', status: 'interviewing', from_domain: 'beta.com', subject: 'Phone screen', received_at: '2026-11-27T11:00:00Z' },
    ];
    mockApi({
      'GET /api/email-suggestions': () => ({ suggestions: list }),
      'POST /api/email-suggestions/7/dismiss': () => {
        calls.push('dismiss 7');
        list = list.filter((s) => s.id !== 7);
      },
      'POST /api/email-suggestions/8/accept': () => {
        calls.push('accept 8');
        list = list.filter((s) => s.id !== 8);
      },
    });
    renderApp(<EmailSuggestions />);
    expect(await screen.findByText('From your email (2)')).toBeInTheDocument();
    expect(screen.getByText(/A rejection from greenhouse-mail.io/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss the suggestion for Acme' }));
    await userEvent.click(await screen.findByRole('button', { name: /Move to Interviewing/ }));
    await waitFor(() => expect(calls).toEqual(['dismiss 7', 'accept 8']));
    await waitFor(() => expect(screen.queryByText(/From your email/)).toBeNull());
  });
});
