import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { type Block, spans } from './parseMarkdown';

const LINK = 'font-medium text-text underline decoration-text/30 underline-offset-[3px] transition-colors hover:decoration-text';

function MdLink({ href, children }: { href: string; children: ReactNode }) {
  // Site pages go through the router; files, anchors, mail and other sites are plain links.
  if (href.startsWith('/') && !/\.\w+$/.test(href)) return <Link to={href} className={LINK}>{children}</Link>;
  const external = /^https?:/.test(href);
  return (
    <a href={href} className={LINK} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {children}
    </a>
  );
}

function Inline({ text }: { text: string }) {
  return (
    <>
      {spans(text).map((s, i) => {
        if (s.type === 'strong') return <strong key={i} className="font-semibold text-text">{s.text}</strong>;
        if (s.type === 'code') return <code key={i} className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.85em] text-text">{s.text}</code>;
        if (s.type === 'link') return <MdLink key={i} href={s.href}>{s.text}</MdLink>;
        return <Fragment key={i}>{s.text}</Fragment>;
      })}
    </>
  );
}

/** Renders the blocks of a company or policy page. */
export function Markdown({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'h2':
            return <h2 key={i} id={b.id} className="mt-12 scroll-mt-24 text-xl font-semibold tracking-tight text-text first:mt-0">{b.text}</h2>;
          case 'h3':
            return <h3 key={i} id={b.id} className="mt-8 scroll-mt-24 text-base font-semibold text-text">{b.text}</h3>;
          case 'p':
            return <p key={i} className="mt-4 leading-7 text-pretty text-muted"><Inline text={b.text} /></p>;
          case 'quote':
            return <blockquote key={i} className="mt-6 border-l-2 border-border pl-4 leading-7 text-muted"><Inline text={b.text} /></blockquote>;
          case 'ul':
          case 'ol': {
            const List = b.type;
            return (
              <List key={i} className={clsx('mt-4 space-y-2 pl-5 leading-7 text-muted marker:text-faint', b.type === 'ul' ? 'list-disc' : 'list-decimal')}>
                {b.items.map((item, j) => <li key={j} className="pl-1"><Inline text={item} /></li>)}
              </List>
            );
          }
          case 'table':
            return (
              // Wide tables scroll sideways on phones; the region takes focus so keyboards can scroll it too.
              <div key={i} className="mt-6 overflow-x-auto" tabIndex={0} role="region" aria-label={b.head.join(', ')}>
                <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
                  <thead>
                    <tr>{b.head.map((h, j) => <th key={j} scope="col" className="border-b border-border py-2 pr-4 font-medium text-text"><Inline text={h} /></th>)}</tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, j) => (
                      <tr key={j}>{row.map((c, k) => <td key={k} className="border-b border-border py-2.5 pr-4 align-top leading-6 text-muted"><Inline text={c} /></td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </>
  );
}
