import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { JobDetail } from '../api/types';
import { stubApi } from '../test/fixtures';
import { jsonBody, renderApp } from '../test/render';
import { InterviewPrepPanel } from './InterviewPrepPanel';

const job = { id: 950, company: 'Vantwell', title: 'Financial Analyst' } as JobDetail;

const prep = {
  prep: {
    role: 'Forecast spending and explain variances to leadership.',
    they_value: ['Excel modeling', 'Clear presentations'],
    intro: 'I am a finance student who built a monthly loan report in Power BI.',
    questions: [
      { question: 'Walk me through a report you built.', kind: 'role', why: 'The posting centers on reporting.', points: ['The monthly loan report in Power BI'], prepare: '' },
      { question: 'Why aerospace?', kind: 'motivation', why: 'The posting leads with the mission.', points: [], prepare: 'Prepare an honest reason for wanting this industry.' },
    ],
    ask: ['What does the first six months look like?'],
  },
  model: 'm',
  created_at: '2026-11-21T10:00:00Z',
  updated_at: '2026-11-21T10:00:00Z',
};

describe('interview prep', () => {
  it('prepares on request, then shows the role, intro, questions with talking points, what to prepare and questions to ask', async () => {
    let posted = 0;
    stubApi({
      'GET /api/jobs/950/interview-prep': () => new Response('{"error":"none"}', { status: 404 }),
      'POST /api/jobs/950/interview-prep': () => {
        posted++;
        return prep;
      },
    });
    renderApp(<InterviewPrepPanel job={job} />);
    await userEvent.click(await screen.findByRole('button', { name: /Prepare for this interview/ }));
    expect(await screen.findByText('Walk me through a report you built.')).toBeInTheDocument();
    expect(posted).toBe(1);
    expect(screen.getByText('Forecast spending and explain variances to leadership.')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'What they value' })).toHaveTextContent('Excel modeling');
    expect(screen.getByText(/built a monthly loan report in Power BI/)).toBeInTheDocument();
    expect(screen.getByText('The monthly loan report in Power BI')).toBeInTheDocument();
    expect(screen.getByText('Prepare an honest reason for wanting this industry.')).toBeInTheDocument();
    expect(screen.getByText('What does the first six months look like?')).toBeInTheDocument();
  });

  it('gives feedback on a practice answer of at least ten words', async () => {
    const sent: unknown[] = [];
    stubApi({
      'GET /api/jobs/950/interview-prep': () => prep,
      'POST /api/jobs/950/interview-prep/practice': (init) => {
        sent.push(jsonBody(init));
        return { strengths: ['You named the report'], improve: ['Say what changed after it'], outline: ['Set the scene', 'Give the result'] };
      },
    });
    renderApp(<InterviewPrepPanel job={job} />);
    const [first] = await screen.findAllByRole('button', { name: /Practice this answer/ });
    await userEvent.click(first);
    const box = screen.getByLabelText('Your answer to: Walk me through a report you built.');
    await userEvent.type(box, 'I built a report.');
    const send = screen.getByRole('button', { name: /Get feedback/ });
    expect(send).toBeDisabled();
    await userEvent.type(box, ' The CFO used it every month to track the loan portfolio closely.');
    await userEvent.click(send);
    expect(await screen.findByText('You named the report')).toBeInTheDocument();
    expect(screen.getByText('Say what changed after it')).toBeInTheDocument();
    expect(screen.getByText('Give the result')).toBeInTheDocument();
    await waitFor(() => expect(sent[0]).toMatchObject({ question: 'Walk me through a report you built.' }));
  });
});
