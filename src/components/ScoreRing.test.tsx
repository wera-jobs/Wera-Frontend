import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScoreRing } from './ScoreRing';

describe('ScoreRing roles', () => {
  it('is a meter only when it has a score', () => {
    render(<ScoreRing score={82} />);
    const m = screen.getByRole('meter', { name: 'Fit score' });
    expect(m).toHaveAttribute('aria-valuenow', '82');
    expect(m).toHaveAttribute('aria-valuemin', '0');
  });

  it('is a labelled image without one, with no meter attributes', () => {
    render(<ScoreRing score={null} />);
    const img = screen.getByRole('img', { name: 'Not scored yet' });
    expect(img).not.toHaveAttribute('aria-valuemin');
    expect(img).not.toHaveAttribute('aria-valuemax');
    expect(screen.queryByRole('meter')).toBeNull();
  });

  it('labels an estimate as an image', () => {
    render(<ScoreRing score={null} estimate={70} />);
    expect(screen.getByRole('img', { name: 'Estimated fit 70, full AI score pending' })).toBeInTheDocument();
  });
});
