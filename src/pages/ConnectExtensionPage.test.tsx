import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { stubApi } from '../test/fixtures';
import { renderApp } from '../test/render';
import ConnectExtensionPage from './ConnectExtensionPage';

afterEach(() => {
  delete document.documentElement.dataset.weraExtension;
});

describe('connecting the extension from the dashboard', () => {
  it('asks to install the extension first when it is not there', async () => {
    stubApi();
    renderApp(<ConnectExtensionPage />);
    expect(await screen.findByRole('heading', { name: 'Install Wera for Chrome first' })).toBeInTheDocument();
  });

  it('hands the extension a key for this account and says when it is connected', async () => {
    document.documentElement.dataset.weraExtension = '0.19.0';
    stubApi({ 'POST /api/ext/tokens/session': () => ({ token: 'wera_ext_abc', user: {}, connection: {} }) });
    const posted: unknown[] = [];
    // The extension's bridge: takes the key, answers "connected".
    const bridge = (e: MessageEvent<{ source?: string; type?: string }>) => {
      if (e.data?.source !== 'wera-dashboard') return;
      posted.push(e.data);
      // As a browser delivers it (jsdom's postMessage leaves out the source and origin).
      window.dispatchEvent(new MessageEvent('message', { data: { source: 'wera-extension', type: 'connected' }, origin: location.origin, source: window }));
    };
    window.addEventListener('message', bridge);
    renderApp(<ConnectExtensionPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Connect this browser' }));
    expect(await screen.findByRole('heading', { name: 'Wera for Chrome is connected' })).toBeInTheDocument();
    await waitFor(() => expect(posted[0]).toMatchObject({ type: 'connect', token: 'wera_ext_abc', server: location.origin }));
    window.removeEventListener('message', bridge);
  });
});
