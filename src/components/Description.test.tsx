import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Description } from './Description';

describe('Description', () => {
  it('turns plain posting text into headings, lists and paragraphs', () => {
    render(
      <Description
        text={'About the role\n\nYou will keep our systems reliable and fast for millions of users.\n\n- Go\n- Kubernetes\n\nApply at https://example.com/apply.'}
      />,
    );
    expect(screen.getByRole('heading', { name: 'About the role' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Go', 'Kubernetes']);
    expect(screen.getByText(/keep our systems reliable/)).toBeInTheDocument();
  });

  it('highlights skills with symbols as whole words, and leaves links whole', () => {
    const { container } = render(
      <Description
        highlight
        text={'We use C++, C# and Node.js daily, not C or Nodes. Docs at https://example.com/c++/node.js-guide here.'}
        matched={['C++', 'Node.js']}
        missing={['C#', 'C']}
      />,
    );
    const marks = [...container.querySelectorAll('mark')].map((m) => [m.textContent, m.title]);
    expect(marks).toEqual([
      ['C++', 'Matched on your profile'],
      ['C#', 'Missing from your profile'],
      ['Node.js', 'Matched on your profile'],
    ]);
    // A one-letter skill ("C") is too short to find reliably: not highlighted.
    // "Nodes" is not Node.js, and the URL is one link with no highlight inside it.
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com/c++/node.js-guide');
    expect(link.querySelector('mark')).toBeNull();
  });

  it('shows nothing highlighted with highlighting off', () => {
    const { container } = render(<Description text="Strong Go skills." matched={['Go']} />);
    expect(container.querySelector('mark')).toBeNull();
  });

  it('makes a missing skill a button when the page can add it', async () => {
    const onMissing = vi.fn();
    render(<Description highlight text="Experience with Terraform and Go." matched={['Go']} missing={['terraform']} onMissing={onMissing} />);
    await userEvent.click(screen.getByRole('button', { name: /^Terraform, missing from your profile/ }));
    expect(onMissing).toHaveBeenCalledWith('terraform');
    // Matched skills stay plain marks.
    expect(screen.queryByRole('button', { name: /^Go/ })).toBeNull();
  });
});
