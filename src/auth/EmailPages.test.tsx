import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { stubApi } from '../test/fixtures';
import { useMe } from '../api/auth';
import { renderApp, jsonBody } from '../test/render';
import AuthPage from './AuthPage';
import { ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from './EmailPages';

describe('account email pages', () => {
  it('confirms an address once', async () => {
    let calls = 0;
    stubApi({ 'POST /api/auth/verify-email': () => (calls++, { verified: true, email: 'ada@example.com' }) });
    renderApp(<VerifyEmailPage />, { path: '/verify-email?token=abc' });
    expect(await screen.findByText('ada@example.com')).toBeInTheDocument();
    expect(calls).toBe(1);
  });

  it('explains a dead link', async () => {
    stubApi({ 'POST /api/auth/verify-email': () => new Response(JSON.stringify({ error: 'this link is invalid or has expired; ask for a new one' }), { status: 400 }) });
    renderApp(<VerifyEmailPage />, { path: '/verify-email?token=old' });
    expect(await screen.findByRole('alert')).toHaveTextContent(/expired/);
  });

  it('asks for a reset link without revealing accounts', async () => {
    let sent = '';
    stubApi({ 'POST /api/auth/password/forgot': (init) => ((sent = jsonBody<{ email: string }>(init).email), { message: 'If an account uses that address, a reset link is on its way.' }) });
    renderApp(<ForgotPasswordPage />, { path: '/forgot-password' });
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com');
    await userEvent.click(screen.getByRole('button', { name: /Send the link/ }));
    expect(await screen.findByText(/a reset link is on its way/)).toBeInTheDocument();
    expect(sent).toBe('ada@example.com');
  });

  it('sets a new password', async () => {
    let body: Record<string, string> = {};
    stubApi({ 'POST /api/auth/password/reset': (init) => ((body = jsonBody(init)), { reset: true }) });
    renderApp(<ResetPasswordPage />, { path: '/reset-password?token=t1' });
    await userEvent.type(screen.getByLabelText(/New password/), 'brand new password');
    await userEvent.type(screen.getByLabelText('Again'), 'brand new passwrd');
    await userEvent.click(screen.getByRole('button', { name: /Change password/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The two passwords differ.');
    await userEvent.clear(screen.getByLabelText('Again'));
    await userEvent.type(screen.getByLabelText('Again'), 'brand new password');
    await userEvent.click(screen.getByRole('button', { name: /Change password/ }));
    expect(await screen.findByText('Your password is changed.')).toBeInTheDocument();
    expect(body).toEqual({ token: 't1', password: 'brand new password' });
  });

  it('offers "Forgot password?" only when email is on', async () => {
    stubApi({ 'GET /api/auth/me': () => new Response('{}', { status: 401 }), 'GET /api/auth/config': () => ({ signup_enabled: true, mail_enabled: true }) });
    renderApp(<AuthPage mode="login" />, { path: '/login' });
    expect(await screen.findByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password');
  });

  it('hides it when email is off', async () => {
    stubApi({ 'GET /api/auth/me': () => new Response('{}', { status: 401 }) });
    renderApp(<AuthPage mode="login" />, { path: '/login' });
    await screen.findByRole('button', { name: /Log in/ });
    await waitFor(() => expect(screen.queryByText('Forgot password?')).toBeNull());
  });
});

describe('the cached user stays true to the server', () => {
  const user = { id: 1, email: 'ada@example.com', name: 'Ada', is_admin: false, created_at: '' };

  it('knows the avatar and the confirmed address right after logging in', async () => {
    let signedIn = false;
    stubApi({
      'GET /api/auth/me': () => (signedIn ? { user, avatar_version: 3, email_verified: true } : new Response('{"error":"no"}', { status: 401 })),
      'POST /api/auth/login': () => ((signedIn = true), { user }),
    });
    const { client } = renderApp(<AuthPage mode="login" />, { path: '/login' });
    await userEvent.type(await screen.findByPlaceholderText('you@example.com'), 'ada@example.com');
    await userEvent.type(document.querySelector('input[type=password]')!, 'a long enough password');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() => expect(client.getQueryData(['me'])).toMatchObject({ email: 'ada@example.com', avatar_version: 3, email_verified: true }));
  });

  it('marks the address confirmed as soon as the link works', async () => {
    let verified = false;
    stubApi({
      'GET /api/auth/me': () => ({ user, avatar_version: null, email_verified: verified }),
      // Answers after the page has read the unconfirmed user.
      'POST /api/auth/verify-email': () =>
        new Promise((done) => setTimeout(() => ((verified = true), done({ verified: true, email: user.email })), 300)),
    });
    // Something on screen reads the user, as the app shell and Settings do.
    function Confirmed() {
      const me = useMe();
      return <p>{me.data?.email_verified ? 'Confirmed' : 'Not confirmed yet'}</p>;
    }
    renderApp(
      <>
        <VerifyEmailPage />
        <Confirmed />
      </>,
      { path: '/verify-email?token=abc' },
    );
    expect(await screen.findByText('Not confirmed yet')).toBeInTheDocument();
    expect(await screen.findByText('Confirmed')).toBeInTheDocument();
  });

  it('forgets the signed-in user after a password reset', async () => {
    stubApi({ 'POST /api/auth/password/reset': () => ({ reset: true }) });
    localStorage.setItem('wera-session', '1');
    const { client } = renderApp(<ResetPasswordPage />, { path: '/reset-password?token=abc' });
    client.setQueryData(['me'], { ...user, avatar_version: null, email_verified: true });
    const [pw, again] = document.querySelectorAll('input[type=password]');
    await userEvent.type(pw, 'a brand new password');
    await userEvent.type(again, 'a brand new password');
    await userEvent.click(screen.getByRole('button', { name: /Save|Set|Change/ }));
    expect(await screen.findByText('Your password is changed.')).toBeInTheDocument();
    expect(client.getQueryData(['me'])).toBeNull();
    expect(localStorage.getItem('wera-session')).toBeNull();
  });

  it('puts the email pages in a main landmark', async () => {
    stubApi({ 'POST /api/auth/verify-email': () => ({ verified: true, email: user.email }) });
    renderApp(<VerifyEmailPage />, { path: '/verify-email?token=abc' });
    expect(await screen.findByRole('main')).toBeInTheDocument();
  });
});
