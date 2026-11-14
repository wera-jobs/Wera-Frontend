import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useUnsavedGuard } from './useUnsavedGuard';

function Page({ dirty, onNav }: { dirty: boolean; onNav: () => void }) {
  useUnsavedGuard(dirty);
  return (
    <div onClick={(e) => { if ((e.target as HTMLElement).tagName === 'A') { e.preventDefault(); onNav(); } }}>
      <a href="/tracker">Tracker</a>
      <a href="/tracker" target="_blank" rel="noreferrer">Tracker in a new tab</a>
      <a href={window.location.pathname + '#answers'}>Saved answers</a>
    </div>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('leaving with unsaved edits', () => {
  it('asks before following a link in the app, and stays when the user says no', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const onNav = vi.fn();
    render(<Page dirty onNav={onNav} />);
    await userEvent.click(screen.getByText('Tracker'));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(onNav).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await userEvent.click(screen.getByText('Tracker'));
    expect(onNav).toHaveBeenCalledTimes(1);
  });

  it('lets through links that keep the page: a new tab, a section of this page', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const onNav = vi.fn();
    render(<Page dirty onNav={onNav} />);
    await userEvent.click(screen.getByText('Tracker in a new tab'));
    await userEvent.click(screen.getByText('Saved answers'));
    expect(confirm).not.toHaveBeenCalled();
    expect(onNav).toHaveBeenCalledTimes(2);
  });

  it('does not ask when nothing is unsaved, and asks the browser to on closing the tab when something is', () => {
    const confirm = vi.spyOn(window, 'confirm');
    const { rerender } = render(<Page dirty={false} onNav={() => {}} />);
    screen.getByText('Tracker').click();
    expect(confirm).not.toHaveBeenCalled();
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    rerender(<Page dirty onNav={() => {}} />);
    const dirty = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });
});
