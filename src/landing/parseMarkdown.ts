// A small Markdown reader for the company and policy pages. It covers the
// subset those pages use, so the site needs no Markdown library: ## and ###
// headings, paragraphs, - and 1. lists, tables, > quotes, and inline
// **bold**, `code` and [links](/path).

export type Block =
  | { type: 'h2' | 'h3'; text: string; id: string }
  | { type: 'p' | 'quote'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'table'; head: string[]; rows: string[][] };

/** "Your choices and rights" becomes "your-choices-and-rights". */
export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function cells(row: string): string[] {
  return row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

const LIST_ITEM = /^(?:[-*]|\d+\.)\s+(.*)$/;
const STARTS_BLOCK = /^(?:#{2,3}\s|\||[-*]\s|\d+\.\s|>)/;

export function parse(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) {
      const text = heading[2].trim();
      blocks.push({ type: heading[1].length === 2 ? 'h2' : 'h3', text, id: slug(text) });
      i++;
    } else if (line.startsWith('|')) {
      const rows: string[][] = [];
      for (; i < lines.length && lines[i].startsWith('|'); i++) rows.push(cells(lines[i]));
      // The second row is the |---| line under the header.
      const [head = [], , ...body] = rows;
      blocks.push({ type: 'table', head, rows: body });
    } else if (LIST_ITEM.test(line)) {
      const ordered = /^\d+\./.test(line);
      const items: string[] = [];
      // A wrapped line continues the item; a heading, table or quote ends the list.
      for (; i < lines.length && lines[i].trim() && (LIST_ITEM.test(lines[i]) || !STARTS_BLOCK.test(lines[i])); i++) {
        const item = LIST_ITEM.exec(lines[i]);
        if (item) items.push(item[1]);
        else items[items.length - 1] += ` ${lines[i].trim()}`;
      }
      blocks.push({ type: ordered ? 'ol' : 'ul', items });
    } else if (line.startsWith('>')) {
      const text: string[] = [];
      for (; i < lines.length && lines[i].startsWith('>'); i++) text.push(lines[i].replace(/^>\s?/, ''));
      blocks.push({ type: 'quote', text: text.join(' ') });
    } else {
      const text: string[] = [];
      for (; i < lines.length && lines[i].trim() && !STARTS_BLOCK.test(lines[i]); i++) text.push(lines[i].trim());
      blocks.push({ type: 'p', text: text.join(' ') });
    }
  }
  return blocks;
}

export type Span =
  | { type: 'text' | 'strong' | 'code'; text: string }
  | { type: 'link'; text: string; href: string };

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/;

/** Splits a line into plain text, **bold**, `code` and [links](href). */
export function spans(text: string): Span[] {
  return text
    .split(INLINE)
    .filter(Boolean)
    .map((part): Span => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return { type: 'strong', text: part.slice(2, -2) };
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return { type: 'code', text: part.slice(1, -1) };
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
      if (link) return { type: 'link', text: link[1], href: link[2] };
      return { type: 'text', text: part };
    });
}
