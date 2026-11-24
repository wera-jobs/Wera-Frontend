import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { JobDetail } from '../api/types';
import { jsonResponse, mockApi, renderApp, jsonBody } from '../test/render';
import { Toasts } from '../lib/toast';
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

  it('downloads the PDF the API makes, under its name, with no print dialog', async () => {
    mockApi({
      'GET /api/auth/me': () => ({ user: { id: 1, email: 'a@example.com', name: 'Ada', is_admin: false, created_at: '' }, avatar_version: null }),
      'GET /api/jobs/5/cover-letter': () => letter('Dear team,\n\nHello.'),
      'GET /api/jobs/5/cover-letter/pdf': () =>
        new Response(new Blob(['%PDF-1.7']), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="Ada_Lovelace_Cover_Letter.pdf"' } }),
    });
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const names: string[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download);
    });
    renderApp(<CoverLetterPanel job={job} />);
    await screen.findByText('Hello.');
    await userEvent.click(screen.getByRole('button', { name: /Download PDF/ }));
    await waitFor(() => expect(names).toEqual(['Ada_Lovelace_Cover_Letter.pdf']));
    expect(print).not.toHaveBeenCalled();
    expect(document.querySelector('iframe')).toBeNull();
    click.mockRestore();
  });

  it('says why when the PDF cannot be made', async () => {
    mockApi({
      'GET /api/auth/me': () => ({ user: { id: 1, email: 'a@example.com', name: 'Ada', is_admin: false, created_at: '' }, avatar_version: null }),
      'GET /api/jobs/5/cover-letter': () => letter('Hello.'),
      'GET /api/jobs/5/cover-letter/pdf': () => jsonResponse(500, { error: 'could not render the letter' }),
    });
    renderApp(<><CoverLetterPanel job={job} /><Toasts /></>);
    await screen.findByText('Hello.');
    await userEvent.click(screen.getByRole('button', { name: /Download PDF/ }));
    expect(await screen.findByText('could not render the letter')).toBeInTheDocument();
  });
});
