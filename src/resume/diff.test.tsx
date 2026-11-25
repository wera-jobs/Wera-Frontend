import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ResumeData } from '../api/resumes';
import { Description } from '../components/Description';
import { diffResume } from './diff';

describe('diffResume', () => {
  const base: ResumeData = {
    name: 'Alex',
    sections: [
      { id: 'sum', kind: 'summary', title: 'Summary', text: 'Backend engineer.' },
      { id: 'sk', kind: 'skills', title: 'Skills', skills: [{ id: 'g1', name: 'Languages', items: 'Go, Python' }] },
      {
        id: 'exp',
        kind: 'entries',
        title: 'Experience',
        entries: [
          {
            id: 'e1',
            heading: 'Acme',
            subheading: 'SWE',
            bullets: [
              { id: 'b1', text: 'Built APIs.' },
              { id: 'b2', text: 'Wrote internal scripts.' },
            ],
          },
        ],
      },
    ],
  };

  it('surfaces changed summary, skills, and bullets plus hidden bullets', () => {
    const tailored: ResumeData = {
      ...base,
      sections: [
        { id: 'sum', kind: 'summary', title: 'Summary', text: 'Backend engineer focused on distributed Go services.' },
        { id: 'sk', kind: 'skills', title: 'Skills', skills: [{ id: 'g1', name: 'Languages', items: 'Go, Rust, Python' }] },
        {
          id: 'exp',
          kind: 'entries',
          title: 'Experience',
          entries: [
            {
              id: 'e1',
              heading: 'Acme',
              subheading: 'SWE',
              bullets: [
                { id: 'b1', text: 'Built high-throughput Go APIs serving 20k RPS.' },
                { id: 'b2', text: 'Wrote internal scripts.', hidden: true },
              ],
            },
          ],
        },
      ],
    };

    const changes = diffResume(base, tailored);
    expect(changes).toHaveLength(4);
    expect(changes.map((c) => c.kind)).toEqual(['changed', 'changed', 'changed', 'hidden']);
  });
});

describe('Description skill highlighting', () => {
  it('highlights matched and missing skills including special regex characters without breaking URLs', () => {
    render(
      <Description
        text={'We use C++ and Node.js daily. See https://example.com/node.js for details.'}
        matched={['C++']}
        missing={['Node.js']}
        highlight
      />,
    );
    const cpp = screen.getByText('C++');
    expect(cpp.tagName).toBe('MARK');
    expect(cpp).toHaveAttribute('title', 'Matched on your profile');
    const node = screen.getByText('Node.js');
    expect(node.tagName).toBe('MARK');
    expect(node).toHaveAttribute('title', 'Missing from your profile');
    expect(screen.getByRole('link', { name: 'example.com/node.js' })).toHaveAttribute('href', 'https://example.com/node.js');
  });
});
