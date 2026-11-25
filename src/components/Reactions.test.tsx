import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { PostSummary } from '../api/community';
import { Toasts } from '../lib/toast';
import { jsonResponse, mockApi, renderApp } from '../test/render';
import { Reactions } from './Reactions';

const post: PostSummary = {
  id: 7, title: 't', excerpt: 'e', tags: [], author: { id: 1, name: 'A', avatar_version: null },
  created_at: '2026-10-10T00:00:00Z', read_minutes: 1, reactions: { like: 2 }, my_reactions: [],
  comment_count: 0, is_mine: false,
};

describe('Reactions', () => {
  it('toggles a reaction optimistically and calls the API', async () => {
    const fetchMock = mockApi({
      'PUT /api/posts/7/reactions/like': () => undefined,
      'DELETE /api/posts/7/reactions/like': () => undefined,
    });
    const { client } = renderApp(<Reactions post={post} />);
    client.setQueryData(['post', 7], { ...post, body: '', comments: [] });

    await userEvent.click(screen.getByRole('button', { name: 'Like 2' }));
    await waitFor(() => expect(client.getQueryData<PostSummary>(['post', 7])?.reactions.like).toBe(3));
    expect(client.getQueryData<PostSummary>(['post', 7])?.my_reactions).toEqual(['like']);
    expect(fetchMock).toHaveBeenCalledWith('/api/posts/7/reactions/like', expect.objectContaining({ method: 'PUT' }));
  });

  it('puts the count back in the post and the feed when saving fails', async () => {
    mockApi({ 'PUT /api/posts/7/reactions/like': () => jsonResponse(500, { error: 'reactions are down' }) });
    const { client } = renderApp(
      <>
        <Reactions post={post} />
        <Toasts />
      </>,
    );
    // The server still has the original counts.
    client.setQueryData(['post', 7], { ...post, body: '', comments: [] });
    client.setQueryData(['posts', {}], { posts: [post], total: 1 });
    client.setQueryDefaults(['post', 7], { queryFn: () => ({ ...post, body: '', comments: [] }) });
    client.setQueryDefaults(['posts'], { queryFn: () => ({ posts: [post], total: 1 }) });

    await userEvent.click(screen.getByRole('button', { name: 'Like 2' }));
    expect(await screen.findByText('reactions are down')).toBeInTheDocument();
    await waitFor(() => expect(client.getQueryState(['posts', {}])?.isInvalidated).toBe(true));
    expect(client.getQueryState(['post', 7])?.isInvalidated).toBe(true);
  });

  it('counts a double click once', async () => {
    mockApi({ 'PUT /api/posts/7/reactions/like': () => new Promise(() => {}) });
    const { client } = renderApp(<Reactions post={post} />);
    client.setQueryData(['post', 7], { ...post, body: '', comments: [] });
    const button = screen.getByRole('button', { name: 'Like 2' });
    await userEvent.click(button);
    // A second "on" while the first is in flight, as a fast double click sends.
    await userEvent.click(button);
    const cached = client.getQueryData<PostSummary>(['post', 7])!;
    expect(cached.my_reactions).toEqual(['like']);
    expect(cached.reactions.like).toBe(3);
  });

  it('compact mode hides reactions nobody used', () => {
    mockApi({});
    renderApp(<Reactions post={post} compact />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
