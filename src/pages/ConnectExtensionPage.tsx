import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Puzzle } from 'lucide-react';
import { api, errorMessage } from '../api/client';
import { EXTENSION_HELP } from '../components/ExtensionPromo';
import { connectExtension, useExtension } from '../lib/extension';
import { useDocumentTitle } from '../lib/useDocumentTitle';

/**
 * Where the extension sends someone to connect: signed in here, one click
 * gives this browser's extension its own key. No password is typed into
 * the extension.
 */
export default function ConnectExtensionPage() {
  useDocumentTitle('Connect Wera for Chrome');
  const version = useExtension();
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'failed'>('idle');
  const [problem, setProblem] = useState('');

  const connect = async () => {
    setState('busy');
    setProblem('');
    try {
      const browser = /Edg\//.test(navigator.userAgent) ? 'Edge' : 'Chrome';
      const { token } = await api<{ token: string }>('/api/ext/tokens/session', {
        method: 'POST',
        body: JSON.stringify({ name: `${browser} extension` }),
      });
      if (await connectExtension(token)) setState('done');
      else {
        setState('failed');
        setProblem("The extension didn't answer. Reload this page and try again, or update the extension.");
      }
    } catch (e) {
      setState('failed');
      setProblem(errorMessage(e, 'network error'));
    }
  };

  return (
    <main className="grid min-h-svh place-items-center bg-bg px-4">
      <div className="w-full max-w-md space-y-4 rounded-card border border-border bg-surface p-6 text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-accent/10">
          {state === 'done' ? <CheckCircle2 className="size-6 text-good" /> : <Puzzle className="size-6 text-accent" />}
        </span>
        {state === 'done' ? (
          <>
            <h1 className="text-lg font-semibold text-text">Wera for Chrome is connected</h1>
            <p className="text-sm text-muted">Go back to the job you were on and press Autofill. You can close this tab.</p>
            <p className="text-xs text-faint">Disconnect it any time in Settings › Connections.</p>
          </>
        ) : !version ? (
          <>
            <h1 className="text-lg font-semibold text-text">Install Wera for Chrome first</h1>
            <p className="text-sm text-muted">Then come back to this page to connect it, with no password to type.</p>
            <Link to={EXTENSION_HELP} className="inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg hover:bg-accent/85">
              How to install it
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-text">Connect Wera for Chrome</h1>
            <p className="text-sm text-muted">This browser's extension gets its own key to your Wera account, so it can show your fit and fill applications.</p>
            <button
              type="button"
              disabled={state === 'busy'}
              onClick={() => void connect()}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg hover:bg-accent/85 disabled:opacity-60"
            >
              {state === 'busy' ? 'Connecting…' : 'Connect this browser'}
            </button>
            {problem && <p className="text-xs text-bad">{problem}</p>}
          </>
        )}
        <Link to="/" className="block text-xs text-muted hover:text-text">
          Go to your dashboard
        </Link>
      </div>
    </main>
  );
}
