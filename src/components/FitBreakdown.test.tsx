import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FitBreakdown } from './JobInsights';

describe('the score broken into parts', () => {
  it('shows each part as the scorer rated it, strongest words for the highest', () => {
    render(<FitBreakdown parts={{ role: 8, seniority: 4, skills: 6, domain: 3, location: 10, blocker: false }} />);
    expect(screen.getByRole('img', { name: 'The work: 8 of 10' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Level: 4 of 10' })).toBeInTheDocument();
    expect(screen.getAllByText('Strong')).toHaveLength(2);
    expect(screen.getAllByText('Partly')).toHaveLength(2);
    expect(screen.getAllByText('Weak')).toHaveLength(1);
    expect(screen.queryByText(/may rule you out/)).toBeNull();
  });

  it('says so when something in the posting may rule the person out', () => {
    render(<FitBreakdown parts={{ role: 8, seniority: 7, skills: 6, domain: 6, location: 1, blocker: true }} />);
    expect(screen.getByText(/Something in the posting may rule you out/)).toBeInTheDocument();
  });
});
