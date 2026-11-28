import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { stubApi } from '../test/fixtures';
import { renderApp } from '../test/render';
import PracticePage from './PracticePage';

describe('PracticePage', () => {
  it('is a form like a company\'s, and Submit sends nothing', async () => {
    const fetched = stubApi();
    renderApp(<PracticePage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Data Analyst at Example Co' })).toBeInTheDocument();
    const form = screen.getByRole('form', { name: 'Job application' });
    expect(screen.getByLabelText(/Resume\/CV/)).toHaveAttribute('type', 'file');
    expect(screen.getByLabelText(/Veteran status/)).toBeInTheDocument();
    for (const box of form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[required]')) {
      box.required = false; // the test presses Submit without filling
    }
    window.scrollTo = vi.fn();
    const before = (fetched as unknown as { mock?: { calls: unknown[] } }).mock?.calls.length ?? 0;
    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Nothing was sent.');
    expect((fetched as unknown as { mock?: { calls: unknown[] } }).mock?.calls.length ?? 0).toBe(before);
  });
});
