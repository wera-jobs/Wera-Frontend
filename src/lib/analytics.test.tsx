import { act, render } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { arrival, pageName, PageTracker, resetTracking, trackingOff } from './analytics';

const nav = (over: Partial<Navigator & { globalPrivacyControl: boolean }>) => ({ doNotTrack: null, webdriver: false, ...over }) as unknown as Navigator;

describe('trackingOff', () => {
  it('sends nothing when the browser asks not to be tracked, under automation, or on a developer machine', () => {
    expect(trackingOff(nav({}), 'www.wera-jobs.com', 'production')).toBe(false);
    expect(trackingOff(nav({ doNotTrack: '1' }), 'www.wera-jobs.com', 'production')).toBe(true);
    expect(trackingOff(nav({ globalPrivacyControl: true }), 'www.wera-jobs.com', 'production')).toBe(true);
    expect(trackingOff(nav({ webdriver: true }), 'www.wera-jobs.com', 'production')).toBe(true);
    expect(trackingOff(nav({}), 'localhost', 'production')).toBe(true);
  });
});

describe('pageName and arrival', () => {
  it('names the front page by who sees it', () => {
    expect(pageName('/', false)).toBe('/');
    expect(pageName('/', true)).toBe('/today');
    expect(pageName('/jobs', true)).toBe('/jobs');
  });
  it('keeps another site as the referrer, and the UTM tags', () => {
    expect(arrival('https://www.linkedin.com/feed/', '?utm_source=linkedin&utm_campaign=launch', 'www.wera-jobs.com'))
      .toEqual({ r: 'https://www.linkedin.com/feed/', us: 'linkedin', um: '', uc: 'launch' });
    expect(arrival('https://www.wera-jobs.com/login', '', 'www.wera-jobs.com').r).toBe('');
  });
});

describe('PageTracker', () => {
  let sent: { k: string; p: string; e?: number }[];
  beforeEach(() => {
    vi.useFakeTimers();
    resetTracking();
    sent = [];
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: (_url: string, data: Blob) => {
        void data.text().then((t) => sent.push(JSON.parse(t) as { k: string; p: string; e?: number }));
        return true;
      },
    });
  });
  afterEach(() => vi.useRealTimers());

  let go: (to: string) => void = () => {};
  function Nav() {
    const n = useNavigate();
    go = (to) => void n(to);
    return null;
  }

  it('counts a page that stays, skips one passed through, and reports time on the page when leaving it', async () => {
    render(<MemoryRouter initialEntries={['/']}><PageTracker always /><Nav /></MemoryRouter>);
    act(() => void vi.advanceTimersByTime(600));
    // A redirect: /login for a moment, then /signup.
    act(() => go('/login'));
    act(() => void vi.advanceTimersByTime(100));
    act(() => go('/signup'));
    act(() => void vi.advanceTimersByTime(2000));
    act(() => go('/'));
    vi.useRealTimers();
    await new Promise((r) => setTimeout(r, 20));
    expect(sent.filter((b) => b.k === 'view').map((b) => b.p)).toEqual(['/', '/signup']);
    const leftSignup = sent.find((b) => b.k === 'leave' && b.p === '/signup');
    expect(leftSignup?.e).toBeGreaterThan(0);
  });
});
