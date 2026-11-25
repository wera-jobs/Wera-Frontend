import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RequireAuth } from '../auth/RequireAuth';
import { stubApi } from '../test/fixtures';
import { renderApp } from '../test/render';
import InfoPage from './InfoPage';

describe('landing page', () => {
  it('greets signed-out visitors at the front door with live numbers', async () => {
    stubApi({
      'GET /api/auth/me': () => new Response('{}', { status: 401 }),
      'GET /api/public/stats': () => ({ companies: 572, industries: 28, open_jobs: 43742, h1b_filings: 495460, h1b_employers: 57990 }),
    });
    renderApp(
      <Routes>
        <Route element={<RequireAuth />}><Route index element={<p>today</p>} /></Route>
      </Routes>,
      { path: '/' },
    );
    expect(await screen.findByRole('heading', { level: 1, name: /Find the jobs that fit you/ })).toBeInTheDocument();
    expect(await screen.findByText('495.5k')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Get started/ })[0]).toHaveAttribute('href', '/signup');
    expect(screen.getAllByRole('link', { name: /Log in/ })[0]).toHaveAttribute('href', '/login');
  });

  it('opens at once for visitors, without waiting for the server', async () => {
    stubApi({ 'GET /api/auth/me': () => new Promise<Response>(() => {}) });
    renderApp(
      <Routes>
        <Route element={<RequireAuth />}><Route index element={<p>today</p>} /></Route>
      </Routes>,
      { path: '/' },
    );
    expect(await screen.findByRole('heading', { level: 1, name: /Find the jobs that fit you/ })).toBeInTheDocument();
    expect(screen.getByText('5,100')).toBeInTheDocument();
  });

  it('keeps someone who was signed in here on the loading screen', async () => {
    localStorage.setItem('wera-session', '1');
    stubApi({ 'GET /api/auth/me': () => new Promise<Response>(() => {}) });
    const { container } = renderApp(
      <Routes>
        <Route element={<RequireAuth />}><Route index element={<p>today</p>} /></Route>
      </Routes>,
      { path: '/' },
    );
    await waitFor(() => expect(container.querySelector('.boot')).toBeInTheDocument());
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('remembers a signed-in visit and forgets it after a 401', async () => {
    stubApi();
    const { unmount } = renderApp(
      <Routes>
        <Route element={<RequireAuth />}><Route index element={<p>today</p>} /></Route>
      </Routes>,
      { path: '/' },
    );
    expect(await screen.findByText('today')).toBeInTheDocument();
    expect(localStorage.getItem('wera-session')).toBe('1');
    unmount();

    stubApi({ 'GET /api/auth/me': () => new Response('{}', { status: 401 }), 'GET /api/public/stats': () => ({}) });
    renderApp(
      <Routes>
        <Route element={<RequireAuth />}><Route index element={<p>today</p>} /></Route>
      </Routes>,
      { path: '/' },
    );
    await waitFor(() => expect(localStorage.getItem('wera-session')).toBeNull());
  });

  it('shows one product screen at a time, in a list of what comes after the match', async () => {
    stubApi({
      'GET /api/auth/me': () => new Response('{}', { status: 401 }),
      'GET /api/public/stats': () => ({ companies: 572, industries: 28, open_jobs: 43742, h1b_filings: 495460, h1b_employers: 57990 }),
    });
    renderApp(
      <Routes>
        <Route element={<RequireAuth />}><Route index element={<p>today</p>} /></Route>
      </Routes>,
      { path: '/' },
    );
    expect(await screen.findByRole('heading', { level: 2, name: 'Everything after the match.' })).toBeInTheDocument();
    const resume = screen.getByRole('button', { name: 'Resume editor' });
    const tracker = screen.getByRole('button', { name: 'Application tracker' });
    expect(resume).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(tracker);
    expect(tracker).toHaveAttribute('aria-expanded', 'true');
    expect(resume).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getAllByRole('img', { name: /A board of job applications/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('img', { name: /The resume editor/ })).not.toBeInTheDocument();
  });

  it('ends with a company footer linking to the company and legal pages', async () => {
    stubApi({
      'GET /api/auth/me': () => new Response('{}', { status: 401 }),
      'GET /api/public/stats': () => ({ companies: 572, industries: 28, open_jobs: 43742, h1b_filings: 495460, h1b_employers: 57990 }),
    });
    renderApp(
      <Routes>
        <Route element={<RequireAuth />}><Route index element={<p>today</p>} /></Route>
      </Routes>,
      { path: '/' },
    );
    const company = await screen.findByRole('navigation', { name: 'Company' });
    expect(within(company).getByRole('link', { name: 'Careers' })).toHaveAttribute('href', '/careers');
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByText('Texas, United States')).toBeInTheDocument();
    expect(screen.queryByText(/never applies for you/)).not.toBeInTheDocument();
  });

  it('lets visitors switch hero previews and try the sample employer wage lookup', async () => {
    stubApi({
      'GET /api/auth/me': () => new Response('{}', { status: 401 }),
      'GET /api/public/stats': () => ({ companies: 572, industries: 28, open_jobs: 43742, h1b_filings: 495460, h1b_employers: 57990 }),
    });
    renderApp(
      <Routes>
        <Route element={<RequireAuth />}><Route index element={<p>today</p>} /></Route>
      </Routes>,
      { path: '/' },
    );
    const trackerTab = await screen.findByRole('tab', { name: 'Tracker' });
    await userEvent.click(trackerTab);
    expect(trackerTab).toHaveAttribute('aria-selected', 'true');

    const nvidiaBtn = screen.getByRole('button', { name: 'NVIDIA' });
    await userEvent.click(nvidiaBtn);
    expect(screen.getByRole('heading', { level: 3, name: 'NVIDIA' })).toBeInTheDocument();
    expect(screen.getByText('$196k')).toBeInTheDocument();

    const search = screen.getByLabelText('Try a sample employer lookup');
    await userEvent.type(search, 'Unknown Corp');
    expect(screen.getByText(/isn't in this 10-employer preview/)).toBeInTheDocument();
  });

  it('filters jobs added today, toggles FAQ answers, and renders footer social placeholders', async () => {
    stubApi({
      'GET /api/auth/me': () => new Response('{}', { status: 401 }),
      'GET /api/public/stats': () => ({ companies: 572, industries: 28, open_jobs: 43742, h1b_filings: 495460, h1b_employers: 57990 }),
    });
    renderApp(
      <Routes>
        <Route element={<RequireAuth />}><Route index element={<p>today</p>} /></Route>
      </Routes>,
      { path: '/' },
    );

    expect(await screen.findByRole('heading', { level: 2, name: 'Jobs added today.' })).toBeInTheDocument();
    const designTab = screen.getByRole('tab', { name: 'Product & Design' });
    await userEvent.click(designTab);
    expect(screen.getByText('Product Designer, Design Systems')).toBeInTheDocument();
    expect(screen.queryByText('Software Engineer, Payments Infrastructure')).not.toBeInTheDocument();

    const autoApplyQ = screen.getByRole('button', { name: /Does Wera auto-apply/ });
    expect(autoApplyQ).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(autoApplyQ);
    expect(autoApplyQ).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Mass auto-applying hurts response rates/)).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /LinkedIn/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /GitHub/ })).toBeInTheDocument();
  });

  it('shows a company page with the footer', () => {
    renderApp(<Routes><Route path="careers" element={<InfoPage page="careers" />} /></Routes>, { path: '/careers' });
    expect(screen.getByRole('heading', { level: 1, name: 'Careers' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Legal' })).toBeInTheDocument();
  });

  it('sends signed-out visitors elsewhere to log in', async () => {
    stubApi({ 'GET /api/auth/me': () => new Response('{}', { status: 401 }) });
    renderApp(
      <Routes>
        <Route element={<RequireAuth />}><Route path="jobs" element={<p>jobs</p>} /></Route>
        <Route path="login" element={<p>login page</p>} />
      </Routes>,
      { path: '/jobs' },
    );
    expect(await screen.findByText('login page')).toBeInTheDocument();
  });
});
