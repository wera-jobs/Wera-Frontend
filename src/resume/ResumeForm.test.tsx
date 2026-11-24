import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ResumeData } from '../api/resumes';
import { ResumeForm } from './ResumeForm';

const data: ResumeData = {
  name: 'Ada Lovelace', email: 'ada@example.com',
  sections: [{ id: 's1', kind: 'entries', title: 'Experience', entries: [{ id: 'e1', heading: 'Engines Inc', subheading: 'SRE', dates: '2025',
    bullets: [{ id: 'b1', text: 'Ran deploys' }, { id: 'b2', text: 'Ran on-call' }] }] }],
};

// On a phone a row's tools fold behind one button (the "actions" menu).
describe('row tools menu', () => {
  const menu = () => screen.getAllByRole('button', { name: 'bullet actions' })[0];
  const open = () => menu().getAttribute('class')?.includes('text-accent');

  it('closes after an action', async () => {
    render(<ResumeForm data={data} onChange={() => {}} />);
    await userEvent.click(menu());
    expect(open()).toBe(true);
    await userEvent.click(screen.getAllByRole('button', { name: 'Move bullet down' })[0]);
    expect(open()).toBe(false);
  });

  it('closes on a tap elsewhere and on Escape', async () => {
    render(<ResumeForm data={data} onChange={() => {}} />);
    await userEvent.click(menu());
    fireEvent.pointerDown(document.body);
    expect(open()).toBe(false);
    await userEvent.click(menu());
    await userEvent.keyboard('{Escape}');
    expect(open()).toBe(false);
  });
});
