import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { answerParts } from '../api/assistant';
import { jsonBody, jsonResponse, mockApi, renderApp } from '../test/render';
import { Toasts } from '../lib/toast';
import { AssistantChat } from './AssistantChat';

/** A streamed answer, sent in two network chunks that split an event. */
function stream(events: [string, unknown][]) {
  const text = events.map(([e, d]) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`).join('');
  const half = Math.floor(text.length / 2);
  return new Response(
    new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(text.slice(0, half)));
        c.enqueue(new TextEncoder().encode(text.slice(half)));
        c.close();
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream' } },
  );
}

describe('AssistantChat', () => {
  it('asks about a job, streams the answer and shows the data it used', async () => {
    const saved: { id: number; role: string; content: string; sources: string[]; created_at: string }[] = [];
    let asked: Record<string, unknown> | null = null;
    mockApi({
      'GET /api/assistant/threads': () => ({ threads: saved.length ? [{ id: 9, job_id: 5, title: 'SRE at Acme', created_at: '', updated_at: '' }] : [], daily_limit: 30, questions_left: 30, enabled: true }),
      'GET /api/assistant/threads/9': () => ({ thread: { id: 9, job_id: 5, title: 'SRE at Acme', created_at: '', updated_at: '' }, messages: saved }),
      'POST /api/assistant': (init) => {
        asked = jsonBody(init);
        saved.push(
          { id: 1, role: 'user', content: 'Should I apply?', sources: [], created_at: '' },
          { id: 2, role: 'assistant', content: 'Yes: it wants Kubernetes [job] and you run it [resume].', sources: ['resume', 'job'], created_at: '' },
        );
        return stream([
          ['thread', { thread_id: 9, title: 'SRE at Acme', job_id: 5 }],
          ['delta', { text: 'Yes: it wants Kubernetes [job] ' }],
          ['delta', { text: 'and you run it [resume].' }],
          ['done', { message_id: 2, content: 'Yes: it wants Kubernetes [job] and you run it [resume].', sources: ['resume', 'job'] }],
        ]);
      },
    });
    renderApp(<AssistantChat jobId={5} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Should I apply?' }));
    expect(await screen.findByText('Used: Resume, The posting')).toBeInTheDocument();
    expect(asked).toEqual({ message: 'Should I apply?', job_id: 5 });
    expect(screen.getByText('The posting')).toBeInTheDocument();
    expect(screen.queryByText(/\[job\]/)).toBeNull();

    // A follow-up continues the same conversation.
    await userEvent.type(screen.getByLabelText('Ask Wera'), 'And the pay?{Enter}');
    await waitFor(() => expect(asked).toEqual({ message: 'And the pay?', thread_id: 9 }));
  });

  it('says why when a question is refused', async () => {
    mockApi({
      'GET /api/assistant/threads': () => ({ threads: [], daily_limit: 30, questions_left: 0, enabled: true }),
      'POST /api/assistant': () => jsonResponse(429, { error: 'you have asked 30 questions in the last 24 hours, the daily limit; try again later' }),
    });
    renderApp(
      <>
        <AssistantChat />
        <Toasts />
      </>,
    );
    expect(await screen.findByText(/0 of 30 questions left today/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Ask Wera'), 'Hi{Enter}');
    expect(await screen.findByText(/the daily limit/)).toBeInTheDocument();
  });
});

describe('answerParts', () => {
  it('turns source tags into parts and keeps the text', () => {
    expect(answerParts('Go fits [resume][job]. Done [nope].')).toEqual([
      { text: 'Go fits' },
      { source: 'resume' },
      { source: 'job' },
      { text: '. Done [nope].' },
    ]);
  });
});
