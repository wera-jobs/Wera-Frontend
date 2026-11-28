import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { stubApi } from '../test/fixtures';
import { renderApp } from '../test/render';
import { DEFAULT_FILTERS, FilterBar, type FilterValues } from './FilterBar';

const show = (values: Partial<FilterValues>) => {
  stubApi();
  const onChange = vi.fn();
  const onReset = vi.fn();
  renderApp(<FilterBar values={{ ...DEFAULT_FILTERS, ...values }} onChange={onChange} onReset={onReset} />);
  return { onChange, onReset };
};

describe('FilterBar', () => {
  it('keeps the dropdowns behind More filters, counting the ones set', async () => {
    show({ status: 'applied', min_pay: 100000, sort: 'newest' });
    const more = screen.getByRole('button', { name: /More filters/ });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    // Sort stays in the first row and is not counted as hidden.
    expect(more).toHaveTextContent('More filters2');
    expect(document.getElementById('more-filters')).toHaveClass('hidden');
    expect(screen.getByLabelText('Sort')).toHaveValue('newest');
    await userEvent.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('more-filters')).not.toHaveClass('hidden');
  });

  it('clears one filter from its chip and toggles a preset', async () => {
    const { onChange } = show({ status: 'applied', min_pay: 100000, min_score: 60 });
    await userEvent.click(screen.getByRole('button', { name: 'Remove $100K+ filter' }));
    expect(onChange).toHaveBeenLastCalledWith({ min_pay: 0 });
    await userEvent.click(screen.getByRole('button', { name: 'Remove 60+ fit filter' }));
    expect(onChange).toHaveBeenLastCalledWith({ min_score: 0 });
    await userEvent.click(screen.getByRole('button', { name: 'Strong fit (80+)' }));
    expect(onChange).toHaveBeenLastCalledWith({ min_score: 80 });
  });

  it('shows a set preset as pressed rather than as a chip', () => {
    show({ work_mode: 'remote', min_score: 80 });
    expect(screen.getByRole('button', { name: 'Remote' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Strong fit (80+)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: /^Remove / })).toBeNull();
  });
});
