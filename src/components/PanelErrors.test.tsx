import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { JobDetail } from '../api/types';
import { jsonResponse, mockApi, renderApp } from '../test/render';
import { CoverLetterPanel } from './CoverLetterPanel';
import { InterviewPrepPanel } from './InterviewPrepPanel';
import { JobResumePanel } from './JobResumePanel';

const job = { id: 5, company: 'Acme', title: 'Site Reliability Engineer' } as JobDetail;
const me = () => ({ user: { id: 1, email: 'a@example.com', name: 'Ada', is_admin: false, created_at: '' }, avatar_version: null });

// A read that fails is not "nothing saved yet": the panels must not offer
// to create one (that would replace what is saved, and spend AI on it).
describe('job view panels when loading fails', () => {
  it('cover letter: an error with Retry, not "Write my letter"', async () => {
    let up = false;
    mockApi({
      'GET /api/auth/me': me,
      'GET /api/jobs/5/cover-letter': () => (up ? { body: 'Saved letter.', model: 'm', edited: false, created_at: '', updated_at: '' } : jsonResponse(500, { error: 'database busy' })),
    });
    renderApp(<CoverLetterPanel job={job} />);
    expect(await screen.findByText('database busy')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Write my letter/ })).toBeNull();
    up = true;
    await userEvent.click(screen.getByRole('button', { name: /Retry/ }));
    expect(await screen.findByText('Saved letter.')).toBeInTheDocument();
  });

  it('interview prep: an error with Retry, not "Prepare for this interview"', async () => {
    mockApi({ 'GET /api/jobs/5/interview-prep': () => jsonResponse(503, { error: 'try again soon' }) });
    renderApp(<InterviewPrepPanel job={job} />);
    expect(await screen.findByText('try again soon')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Prepare for this interview/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
  });

  it('resume: an error with Retry, not "Tailor my resume"', async () => {
    mockApi({
      'GET /api/jobs/5/keywords': () => ({ keywords: ['go'], coverage: null, resume_id: 3 }),
      'GET /api/jobs/5/resume': () => jsonResponse(500, { error: 'could not read the resume' }),
    });
    renderApp(<JobResumePanel job={job} />);
    expect(await screen.findByText('could not read the resume')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tailor my resume/ })).toBeNull();
  });
});
