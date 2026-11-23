import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { JobDetail } from '../api/types';
import { jsonResponse, mockApi, renderApp, jsonBody } from '../test/render';
import { CoverLetterPanel } from './CoverLetterPanel';

const job = { id: 5, company: 'Acme', title: 'Site Reliability Engineer' } as JobDetail;
const letter = (body: string, edited = false) => ({ body, model: 'm', edited, created_at: '', updated_at: '' });

describe('CoverLetterPanel', () => {
  it('writes a letter on request, then saves edits', async () => {
    let stored: ReturnType<typeof letter> | null = null;
    mockApi({
      'GET /api/auth/me': () => ({ user: { id: 1, email: 'a@example.com', name: 'Ada', is_admin: false, created_at: '' }, avatar_version: null }),
      'GET /api/jobs/5/cover-letter': () => stored ?? jsonResponse(404, { error: 'no letter' }),
      'POST /api/jobs/5/cover-letter': () => (stored = letter('Dear Hiring Team,\n\nI keep systems up.')),
      'PUT /api/jobs/5/cover-letter': (init) => (stored = letter(jsonBody<{ body: string }>(init).body, true)),
    });
    renderApp(<CoverLetterPanel job={job} />);

    await userEvent.click(await screen.findByRole('button', { name: /Write my letter/ }));
    expect(await screen.findByText('I keep systems up.')).toBeInTheDocument();
    expect(screen.getByText('Hiring Team, Acme', { exact: false })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Edit/ }));
    const editor = screen.getByLabelText('Cover letter');
    expect(editor).toHaveValue('Dear Hiring Team,\n\nI keep systems up.');
    await userEvent.clear(editor);
    await userEvent.type(editor, 'Dear team, hello.');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Dear team, hello.')).toBeInTheDocument();
    expect(screen.getByText('Edited by you')).toBeInTheDocument();
  });

  it('keeps the print page until printing is over', async () => {
    mockApi({
      'GET /api/auth/me': () => ({ user: { id: 1, email: 'a@example.com', name: 'Ada', is_admin: false, created_at: '' }, avatar_version: null }),
      'GET /api/jobs/5/cover-letter': () => letter('Dear team,\n\nHello.'),
    });
    renderApp(<CoverLetterPanel job={job} />);
    await screen.findByText('Hello.');
    await userEvent.click(screen.getByRole('button', { name: /Download PDF/ }));
    const frame = document.querySelector('iframe')!;
    expect(frame).not.toBeNull();
    // A slow print preview: still there well after the old one-second cutoff.
    await new Promise((done) => setTimeout(done, 1200));
    expect(document.body.contains(frame)).toBe(true);
    frame.contentWindow!.dispatchEvent(new Event('afterprint'));
    expect(document.body.contains(frame)).toBe(false);
  });
});

