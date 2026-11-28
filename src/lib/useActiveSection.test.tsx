import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useActiveSection } from './useActiveSection';

type Callback = (entries: { target: Element; isIntersecting: boolean }[]) => void;
let fire: Callback = () => {};

function Probe() {
  return <p data-testid="active">{useActiveSection(['a', 'b', 'c']) ?? 'none'}</p>;
}

describe('useActiveSection', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is the first section in page order inside the band', () => {
    const observed: string[] = [];
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb: Callback) { fire = cb; }
      observe(el: Element) { observed.push(el.id); }
      disconnect() {}
    });
    render(<><section id="a" /><section id="b" /><section id="c" /><Probe /></>);
    expect(observed).toEqual(['a', 'b', 'c']);
    expect(screen.getByTestId('active')).toHaveTextContent('none');
    const el = (id: string) => document.getElementById(id)!;
    act(() => fire([{ target: el('c'), isIntersecting: true }, { target: el('b'), isIntersecting: true }]));
    expect(screen.getByTestId('active')).toHaveTextContent('b');
    act(() => fire([{ target: el('b'), isIntersecting: false }]));
    expect(screen.getByTestId('active')).toHaveTextContent('c');
    // Leaving every section keeps the last one lit.
    act(() => fire([{ target: el('c'), isIntersecting: false }]));
    expect(screen.getByTestId('active')).toHaveTextContent('c');
  });
});
