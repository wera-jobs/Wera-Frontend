import { describe, expect, it } from 'vitest';
import { parse, slug, spans } from './parseMarkdown';

describe('parse', () => {
  it('reads headings with anchors, and joins paragraph lines', () => {
    expect(parse('## Your choices and rights\n\nOne line\nand the next.\n\n### Children')).toEqual([
      { type: 'h2', text: 'Your choices and rights', id: 'your-choices-and-rights' },
      { type: 'p', text: 'One line and the next.' },
      { type: 'h3', text: 'Children', id: 'children' },
    ]);
  });

  it('reads lists, folding a wrapped line into its item', () => {
    expect(parse('- one\n- two\n  continued\n\n1. first\n2. second')).toEqual([
      { type: 'ul', items: ['one', 'two continued'] },
      { type: 'ol', items: ['first', 'second'] },
    ]);
  });

  it('reads a table without its separator row', () => {
    expect(parse('| Name | Lasts |\n|---|---|\n| `wera_session` | 30 days |')).toEqual([
      { type: 'table', head: ['Name', 'Lasts'], rows: [['`wera_session`', '30 days']] },
    ]);
  });

  it('reads quotes, and starts a new block where a list or heading begins', () => {
    expect(parse('> Note\n> more\nText\n- item\n## Next')).toEqual([
      { type: 'quote', text: 'Note more' },
      { type: 'p', text: 'Text' },
      { type: 'ul', items: ['item'] },
      { type: 'h2', text: 'Next', id: 'next' },
    ]);
  });
});

describe('spans', () => {
  it('splits bold, code and links out of plain text', () => {
    expect(spans('See **the policy** for `wera_session`, or [write to us](mailto:a@b.c).')).toEqual([
      { type: 'text', text: 'See ' },
      { type: 'strong', text: 'the policy' },
      { type: 'text', text: ' for ' },
      { type: 'code', text: 'wera_session' },
      { type: 'text', text: ', or ' },
      { type: 'link', text: 'write to us', href: 'mailto:a@b.c' },
      { type: 'text', text: '.' },
    ]);
  });

  it('leaves stray markers as text', () => {
    expect(spans('5 * 3 = 15')).toEqual([{ type: 'text', text: '5 * 3 = 15' }]);
  });
});

describe('slug', () => {
  it('makes anchor ids from headings', () => {
    expect(slug('How long we keep it')).toBe('how-long-we-keep-it');
    expect(slug('`wera_session` cookie')).toBe('wera-session-cookie');
  });
});
