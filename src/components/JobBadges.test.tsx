import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AutofilledBadge, OldPostingBadge, PostedAge, WorkModeBadge } from './JobBadges';

describe('AutofilledBadge', () => {
  it('marks a job the extension filled, saying when', () => {
    render(<AutofilledBadge at={new Date(Date.now() - 2 * 3600_000).toISOString()} />);
    expect(screen.getByText('Autofilled').closest('[title]')).toHaveAttribute('title', expect.stringContaining('Filled with the Wera extension'));
  });

  it('shows nothing for a job never filled', () => {
    const { container } = render(<AutofilledBadge at={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

describe('PostedAge', () => {
  it('goes by the posting date when the board gives an earlier one than Wera found it', () => {
    render(<PostedAge job={{ posted_at: ago(90), first_seen_at: ago(1) }} />);
    expect(screen.getByText('3mo ago')).toHaveAttribute('title', expect.stringContaining('Wera found it'));
  });

  it('uses when Wera found it without a posting date', () => {
    render(<PostedAge job={{ posted_at: null, first_seen_at: ago(2) }} />);
    expect(screen.getByText('2d ago')).toHaveAttribute('title', expect.not.stringContaining('Wera found it'));
  });
});

describe('OldPostingBadge', () => {
  it('marks a posting up for months', () => {
    render(<OldPostingBadge job={{ posted_at: ago(75), first_seen_at: ago(1), closed_at: null }} />);
    expect(screen.getByText('Old posting').closest('[title]')).toHaveAttribute('title', expect.stringContaining('Up for 75 days'));
  });

  it('leaves recent and closed postings alone', () => {
    const { container } = render(
      <>
        <OldPostingBadge job={{ posted_at: ago(20), first_seen_at: ago(20), closed_at: null }} />
        <OldPostingBadge job={{ posted_at: ago(200), first_seen_at: ago(20), closed_at: ago(1) }} />
      </>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('WorkModeBadge', () => {
  it('names the work mode, and says nothing when the posting does not', () => {
    render(<WorkModeBadge value="hybrid" />);
    expect(screen.getByText('Hybrid')).toBeInTheDocument();
    const { container } = render(<WorkModeBadge value="unknown" />);
    expect(container).toBeEmptyDOMElement();
  });
});
