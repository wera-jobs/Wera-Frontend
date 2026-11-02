import { describe, expect, it } from 'vitest';
import { wrappedX } from './wrappedX';

describe('wrappedX', () => {
  it('places a word relative to the window', () => {
    expect(wrappedX(300, 50, 100, 1000)).toBe(200);
  });

  it('brings a word back around after it leaves the row', () => {
    expect(wrappedX(300, 50, 1200, 1000)).toBe(100);
    expect(wrappedX(300, 50, -900, 1000)).toBe(200);
  });

  it('keeps a word that is only partly past the left edge', () => {
    expect(wrappedX(300, 50, 320, 1000)).toBe(-20);
  });
});
