import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDocumentTitle } from './useDocumentTitle';

describe('useDocumentTitle', () => {
  it('adds the brand after the page name', () => {
    renderHook(() => useDocumentTitle('Jobs'));
    expect(document.title).toBe('Jobs · Wera');
  });

  it('leaves a title that already names Wera alone', () => {
    renderHook(() => useDocumentTitle('Wera: find jobs that fit you', false));
    expect(document.title).toBe('Wera: find jobs that fit you');
  });
});
