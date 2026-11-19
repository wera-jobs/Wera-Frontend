import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompanyLogo } from './CompanyLogo';

describe('company logos', () => {
  it("shows Wera's copy of the logo", () => {
    const { container } = render(<CompanyLogo name="Acme" url="/api/companies/7/logo?v=1" />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/api/companies/7/logo?v=1');
  });

  it('falls back to a lettered tile with no logo, or one that fails to load', () => {
    const { container, rerender } = render(<CompanyLogo name="  ácme labs" />);
    expect(container.textContent).toBe('Á');
    rerender(<CompanyLogo name="Globex" url="/api/companies/8/logo?v=1" />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toBe('G');
  });
});
