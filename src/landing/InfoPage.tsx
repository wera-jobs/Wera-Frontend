import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { ThemeToggle } from '../lib/theme';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { INFO_PAGES } from './infoPages';
import { Markdown } from './Markdown';
import { parse } from './parseMarkdown';
import { SiteFooter } from './SiteFooter';

// Each page's text is its own small chunk, fetched when the page opens.
const TEXTS = import.meta.glob<string>('./pages/*.md', { query: '?raw', import: 'default' });

/** A company, help or policy page: its title, then its text from pages/<page>.md. */
export default function InfoPage({ page }: { page: keyof typeof INFO_PAGES }) {
  const { title, blurb, effective } = INFO_PAGES[page];
  useDocumentTitle(title);
  const text = useQuery({
    queryKey: ['info-page', page],
    queryFn: () => TEXTS[`./pages/${page}.md`](),
    staleTime: Infinity,
  });
  const blocks = useMemo(() => (text.data ? parse(text.data) : []), [text.data]);
  const sections = blocks.flatMap((b) => (b.type === 'h2' ? [b] : []));

  // A link to /privacy#contact lands on that section once the text is in.
  const { hash } = useLocation();
  useEffect(() => {
    if (hash && text.data) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
  }, [hash, text.data]);

  return (
    <div className="flex min-h-svh flex-col bg-bg text-text">
      <a href="#main" className="sr-only rounded-lg bg-surface px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50">
        Skip to content
      </a>
      <header className="border-b border-border">
        <nav className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6" aria-label="Main">
          <Link to="/" aria-label="Wera home"><Logo /></Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login" className="rounded-lg px-2 py-2 text-sm font-medium text-muted hover:text-text sm:px-3">Log in</Link>
            <Link to="/signup" className="rounded-lg bg-text px-3.5 py-2 text-sm font-semibold text-bg hover:opacity-90">Get started</Link>
          </div>
        </nav>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,44rem)_1fr]">
          <article>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{title}</h1>
            <p className="mt-4 text-lg text-pretty text-muted">{blurb}</p>
            {effective && <p className="mt-4 text-sm text-faint">Effective {effective}</p>}
            <div className="mt-10 border-t border-border pt-10">
              {text.isPending && <div className="h-64 animate-pulse rounded-lg bg-surface-2/60" aria-label="Loading" />}
              {text.isError && (
                <p role="alert" className="text-muted">
                  Couldn't load this page. Check your connection, then{' '}
                  <button type="button" onClick={() => void text.refetch()} className="font-medium text-text underline underline-offset-[3px]">try again</button>.
                </p>
              )}
              {text.data && <Markdown blocks={blocks} />}
            </div>
          </article>
          {sections.length >= 4 && (
            <nav aria-label="On this page" className="hidden lg:block">
              <div className="sticky top-12">
                <h2 className="text-sm font-medium text-text">On this page</h2>
                <ul className="mt-3 space-y-2 border-l border-border text-sm">
                  {sections.map((s) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`} className="-ml-px block border-l border-transparent pl-4 text-muted transition-colors hover:border-text hover:text-text">{s.text}</a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
