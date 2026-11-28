import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { SavedAnswer } from '../api/extension';
import { stubApi } from '../test/fixtures';
import { jsonBody, renderApp } from '../test/render';
import { Toasts } from '../lib/toast';
import { SavedAnswers } from './SavedAnswers';

const answer = (id: number, question: string, text: string, over: Partial<SavedAnswer> = {}): SavedAnswer => ({
  id, question, answer: text, kind: 'text', company: 'Acme', uses: 1, updated_at: new Date().toISOString(), ...over,
});

describe('SavedAnswers', () => {
  it('says what it is for when empty', async () => {
    stubApi();
    renderApp(<SavedAnswers />);
    expect(await screen.findByText(/None yet/)).toBeInTheDocument();
  });

  it('searches, edits and forgets answers', async () => {
    let list = [answer(1, 'What is your notice period?', 'Two weeks', { uses: 3 }), answer(2, 'Why Acme?', 'Robots at scale.', { kind: 'long', company: '' })];
    const forgotten: string[] = [];
    stubApi({
      'GET /api/applicant/answers': () => ({ answers: list }),
      'PATCH /api/applicant/answers/1': (init) => {
        list = list.map((a) => (a.id === 1 ? { ...a, answer: jsonBody<{ answer: string }>(init).answer } : a));
        return { answers: list };
      },
      'DELETE /api/applicant/answers/2': () => (forgotten.push('2'), (list = list.filter((a) => a.id !== 2)), new Response(null, { status: 204 })),
      'DELETE /api/applicant/answers': () => (forgotten.push('all'), (list = []), new Response(null, { status: 204 })),
    });
    renderApp(<><SavedAnswers /><Toasts /></>);
    expect(await screen.findByText('Two weeks')).toBeInTheDocument();
    expect(screen.getByText(/Last given for Acme, .* used 3 times/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Search saved answers'), 'robots');
    expect(screen.queryByText('Two weeks')).toBeNull();
    expect(screen.getByText('Robots at scale.')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Search saved answers'));

    await userEvent.click(screen.getByRole('button', { name: 'Edit the answer to What is your notice period?' }));
    const box = screen.getByLabelText('Answer to What is your notice period?');
    await userEvent.clear(box);
    await userEvent.type(box, 'One month');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('One month')).toBeInTheDocument();

    // Asked by one form only: under the fold.
    expect(screen.queryByText('Robots at scale.')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /1 answer to one form's own questions/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Forget the answer to Why Acme?' }));
    await waitFor(() => expect(screen.queryByText('Robots at scale.')).toBeNull());

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await userEvent.click(screen.getByRole('button', { name: 'Forget all' }));
    expect(await screen.findByText(/None yet/)).toBeInTheDocument();
    expect(forgotten).toEqual(['2', 'all']);
  });

  it('puts the questions most forms ask first, and table rows and option texts under the fold', async () => {
    stubApi({
      'GET /api/applicant/answers': () => ({ answers: [
        answer(1, 'How did you hear about us?', 'LinkedIn'),
        answer(2, 'Do you have a non-compete agreement?', 'No'),
        answer(3, 'Skill level', '4', { uses: 4 }),
        answer(4, 'Yes Required', 'Yes', { uses: 7 }),
        answer(5, 'What is your favorite Linux init system?', 'systemd', { kind: 'long' }),
      ] }),
    });
    renderApp(<SavedAnswers />);
    const common = await screen.findByRole('region', { name: 'Asked on most forms' });
    expect(within(common).getByText('LinkedIn')).toBeInTheDocument();
    expect(within(common).getByText('No')).toBeInTheDocument();
    expect(within(common).queryByText('Skill level')).toBeNull();
    expect(screen.getByRole('button', { name: /3 answers to one form's own questions/ })).toBeInTheDocument();
    expect(screen.queryByText('systemd')).toBeNull();
  });

  it('groups by topic, collapses large lists, and folds duplicate-answer wordings', async () => {
    stubApi({
      'GET /api/applicant/answers': () => ({ answers: [
        answer(1, 'Will you require visa sponsorship?', 'Yes', { uses: 5 }),
        answer(2, 'Do you need sponsorship now or in the future?', 'Yes', { uses: 2 }),
        answer(3, 'Are you authorized to work in the US?', 'Yes', { uses: 3 }),
        answer(4, 'How did you hear about us?', 'LinkedIn', { uses: 4 }),
        answer(5, 'How did you hear about this role?', 'LinkedIn', { uses: 2 }),
        answer(6, 'What is your expected salary?', '$150,000'),
        answer(7, 'Are you willing to relocate?', 'Yes'),
      ] }),
    });
    renderApp(<SavedAnswers />);
    // With > 6 common answers, topic buckets start collapsed.
    const workAuthBtn = await screen.findByRole('button', { name: /Work authorization & visas/ });
    expect(workAuthBtn).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(workAuthBtn);
    expect(workAuthBtn).toHaveAttribute('aria-expanded', 'true');
    // 3 identical "Yes" sponsorship/auth answers fold into 1 cluster row.
    expect(screen.getByText(/Used 10 times across 3 wordings/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Show 2 more wordings/ }));
    expect(screen.getByText('Do you need sponsorship now or in the future?')).toBeInTheDocument();
  });

  it("forgets a whole topic, or every one form's own answer, after a confirm", async () => {
    let list = [
      answer(1, 'Will you require visa sponsorship?', 'Yes'),
      answer(2, 'Are you authorized to work in the US?', 'Yes'),
      answer(3, 'How did you hear about us?', 'LinkedIn'),
      answer(4, 'What is your favorite Linux init system?', 'systemd'),
      answer(5, 'Describe a project you led at Acme', 'The robots.'),
    ];
    const deleted: number[] = [];
    const del = (id: number) => () => {
      deleted.push(id);
      list = list.filter((a) => a.id !== id);
      return new Response(null, { status: 204 });
    };
    stubApi({
      'GET /api/applicant/answers': () => ({ answers: list }),
      ...Object.fromEntries([1, 2, 3, 4, 5].map((id) => [`DELETE /api/applicant/answers/${id}`, del(id)])),
    });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
    renderApp(<><SavedAnswers /><Toasts /></>);
    await screen.findByRole('region', { name: 'Asked on most forms' });

    // Declining the confirm forgets nothing.
    await userEvent.click(screen.getByRole('button', { name: 'Forget these' }));
    expect(deleted).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Forget these' }));
    expect(await screen.findByText('Forgot 2 answers.')).toBeInTheDocument();
    expect(deleted.sort()).toEqual([4, 5]);

    await userEvent.click(screen.getByRole('button', { name: 'Forget this topic (2)' }));
    await waitFor(() => expect(deleted.sort()).toEqual([1, 2, 4, 5]));
    expect(confirm).toHaveBeenLastCalledWith(expect.stringMatching(/^Forget all 2 answers about work authorization/));
    // The other topic stays.
    expect(await screen.findByText('LinkedIn')).toBeInTheDocument();
    confirm.mockRestore();
  });
});
