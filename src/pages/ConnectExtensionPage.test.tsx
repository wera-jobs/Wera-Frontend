import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { stubApi } from '../test/fixtures';
import { useExtension } from '../lib/extension';
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

  it('revokes the key when the extension never takes it', async () => {
    document.documentElement.dataset.weraExtension = '0.19.0';
    const deleted: string[] = [];
    stubApi({
      'POST /api/ext/tokens/session': () => ({ token: 'wera_ext_unused', user: {}, connection: { id: 41 } }),
      'DELETE /api/ext/tokens/41': () => (deleted.push('41'), undefined),
    });
    // No bridge answers: the handshake times out.
    renderApp(<ConnectExtensionPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Connect this browser' }));
    expect(await screen.findByText(/didn't answer/, {}, { timeout: 8000 })).toBeInTheDocument();
    expect(deleted).toEqual(['41']);
  }, 12000);
});

describe('useExtension', () => {
  it('sees an extension that marked the page after the first render', () => {
    function Version() {
      return <p>version {useExtension() ?? 'none'}</p>;
    }
    // Renders after Version and marks the page before effects run, as the
    // extension's content script can, with its ready event already sent.
    function LateBridge() {
      document.documentElement.dataset.weraExtension = '0.20.0';
      return null;
    }
    renderApp(
      <>
        <Version />
        <LateBridge />
      </>,
    );
    expect(screen.getByText('version 0.20.0')).toBeInTheDocument();
  });
});
