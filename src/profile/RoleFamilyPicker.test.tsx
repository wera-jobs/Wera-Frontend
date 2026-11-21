import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { options } from '../test/fixtures';
import { RoleFamilyPicker } from './RoleFamilyPicker';

function Harness({ start = [] as string[], flat = false, later = [] as string[] }) {
  const [v, setV] = useState<string[]>(start);
  return (
    <>
      <RoleFamilyPicker fields={flat ? undefined : options.fields} families={options.role_families} value={v} onChange={setV} />
      <output>{v.join(',')}</output>
      {/* Stands in for the resume pre-fill, which lands after the step opens. */}
      <button type="button" onClick={() => setV(later)}>
        Pre-fill
      </button>
    </>
  );
}

const chips = () => within(screen.getByRole('group', { name: 'Role families' })).getAllByRole('button').map((b) => b.textContent);

describe('RoleFamilyPicker', () => {
  it('shows one career field at a time and keeps picks across fields', async () => {
    render(<Harness start={['sre']} />);
    expect(screen.getByRole('tab', { name: /Technology & data/ })).toHaveAttribute('aria-selected', 'true');
    expect(chips()).toEqual(['Data science', 'Platform engineering', 'Site reliability']);
    expect(screen.getByText((_, el) => el?.tagName === 'SPAN' && el.textContent === '1 picked')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: /Healthcare/ }));
    expect(chips()).toEqual(['Registered nursing (RN)']);
    await userEvent.click(screen.getByRole('button', { name: 'Registered nursing (RN)' }));
    expect(screen.getByRole('status')).toHaveTextContent('sre,registered_nursing');
    await userEvent.click(screen.getByRole('button', { name: /Registered nursing/ }));
    expect(screen.getByRole('status')).toHaveTextContent(/^sre$/);
  });

  it('opens on the field of what is already picked', () => {
    render(<Harness start={['registered_nursing']} />);
    expect(screen.getByRole('tab', { name: /Healthcare/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('opens on the field with the most picks, not the first pick', () => {
    render(<Harness start={['registered_nursing', 'sre', 'platform']} />);
    expect(screen.getByRole('tab', { name: /Technology & data/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('follows picks that arrive after it opens, until the person chooses a tab', async () => {
    render(<Harness later={['registered_nursing']} />);
    expect(screen.getByRole('tab', { name: /Technology & data/ })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Pre-fill' }));
    expect(screen.getByRole('tab', { name: /Healthcare/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('stays on the tab the person chose when picks change', async () => {
    render(<Harness later={['registered_nursing']} />);
    await userEvent.click(screen.getByRole('tab', { name: /Healthcare/ }));
    await userEvent.click(screen.getByRole('tab', { name: /Technology & data/ }));
    // The pre-fill puts every pick in Healthcare; the person's choice of Technology stands.
    await userEvent.click(screen.getByRole('button', { name: 'Pre-fill' }));
    expect(screen.getByRole('tab', { name: /Technology & data/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps the tab when the last pick in it is removed', async () => {
    render(<Harness start={['sre', 'registered_nursing']} />);
    expect(screen.getByRole('tab', { name: /Technology & data/ })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('button', { name: /Site reliability/ }));
    expect(screen.getByRole('status')).toHaveTextContent(/^registered_nursing$/);
    expect(screen.getByRole('tab', { name: /Technology & data/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('lists every role when the server sends no fields', () => {
    render(<Harness flat />);
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(chips()).toHaveLength(4);
  });
});
