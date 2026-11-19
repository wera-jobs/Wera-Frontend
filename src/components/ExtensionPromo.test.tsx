import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { stubApi } from '../test/fixtures';
import { renderApp } from '../test/render';
import { ExtensionPromo } from './ExtensionPromo';

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.weraExtension;
});

const none = { 'GET /api/ext/tokens': () => ({ connections: [] }) };

describe('the extension offer on Today', () => {
  it('offers the extension to someone without it, and goes for good when dismissed', async () => {
    stubApi(none);
    const { unmount } = renderApp(<ExtensionPromo />);
    expect(await screen.findByRole('heading', { name: 'Fill applications in one click' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get the extension' })).toHaveAttribute('href', '/help');
    await userEvent.click(screen.getByRole('button', { name: "Don't show this again" }));
    expect(screen.queryByRole('heading', { name: 'Fill applications in one click' })).toBeNull();
    unmount();
    renderApp(<ExtensionPromo />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('heading', { name: 'Fill applications in one click' })).toBeNull();
  });

  it('stays away when the extension is here, or connected from another browser', async () => {
    document.documentElement.dataset.weraExtension = '0.17.1';
    stubApi(none);
    const { unmount } = renderApp(<ExtensionPromo />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('heading', { name: 'Fill applications in one click' })).toBeNull();
    unmount();
    delete document.documentElement.dataset.weraExtension;
    stubApi({ 'GET /api/ext/tokens': () => ({ connections: [{ id: 1, name: 'Chrome', created_at: '2026-11-01T00:00:00Z', last_used_at: null }] }) });
    renderApp(<ExtensionPromo />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('heading', { name: 'Fill applications in one click' })).toBeNull();
  });
});
