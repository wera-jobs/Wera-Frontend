import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/render';
import { INFO_PAGES } from './infoPages';
import InfoPage from './InfoPage';
import { parse, spans } from './parseMarkdown';
import { SiteFooter } from './SiteFooter';

const TEXTS = import.meta.glob<string>('./pages/*.md', { query: '?raw', import: 'default', eager: true });
const text = (page: string) => TEXTS[`./pages/${page}.md`];

/** Where a site-relative link may point: the front page, the auth pages, a company page or a file in public/. */
function resolves(href: string): boolean {
  const path = href.split('#')[0];
  if (['/', '/signup', '/login'].includes(path)) return true;
  if (path.slice(1) in INFO_PAGES) return true;
  return /\.\w+$/.test(path) && existsSync(resolve(process.cwd(), 'public', path.slice(1)));
}

function render(page: string) {
  return renderApp(<Routes><Route path={page} element={<InfoPage page={page} />} /></Routes>, { path: `/${page}` });
}

describe('company and policy pages', () => {
  it('has a text for every page, and no text without a page', () => {
    const files = Object.keys(TEXTS).map((f) => f.replace('./pages/', '').replace('.md', '')).sort();
    expect(files).toEqual(Object.keys(INFO_PAGES).sort());
  });

  it.each(Object.keys(INFO_PAGES))('%s is finished: no placeholders, drafts or "coming soon"', (page) => {
    const t = text(page);
    expect(t).not.toMatch(/\[[A-Z][A-Z ]{2,}[^\]]*\]/);
    expect(t).not.toMatch(/coming soon|\*\*Draft\.|not in force|not reviewed by a lawyer|lorem/i);
    expect(t).not.toMatch(/—/);
  });

  it.each(Object.keys(INFO_PAGES))('%s links only to pages and files that exist', (page) => {
    for (const block of parse(text(page))) {
      const lines = 'items' in block ? block.items : 'rows' in block ? [...block.head, ...block.rows.flat()] : [block.text];
      for (const line of lines) {
        for (const s of spans(line)) {
          if (s.type === 'link' && s.href.startsWith('/')) expect(resolves(s.href), `${page} links to ${s.href}`).toBe(true);
        }
      }
    }
  });

  it('shows a policy with its date, sections, tables and links', async () => {
    render('privacy');
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeInTheDocument();
    expect(screen.getByText('Effective November 11, 2026')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'The short version' })).toHaveAttribute('id', 'the-short-version');
    expect(screen.getAllByRole('table').length).toBeGreaterThan(1);
    expect(screen.getAllByRole('link', { name: 'cookie policy' })[0]).toHaveAttribute('href', '/cookies');
    expect(screen.getAllByRole('link', { name: 'jessechumo@gmail.com' })[0]).toHaveAttribute('href', 'mailto:jessechumo@gmail.com');
    const contents = screen.getByRole('navigation', { name: 'On this page' });
    expect(within(contents).getByRole('link', { name: 'Children' })).toHaveAttribute('href', '#children');
    expect(document.title).toBe('Privacy policy · Wera');
  });

  it('keeps a short page plain, without dates or contents', async () => {
    render('careers');
    expect(await screen.findByText(/We are not hiring for any roles right now/)).toBeInTheDocument();
    expect(screen.queryByText(/^Effective/)).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'On this page' })).not.toBeInTheDocument();
  });

  it('opens other sites in a new tab', async () => {
    render('accessibility');
    const link = await screen.findByRole('link', { name: /Web Content Accessibility Guidelines/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

describe('search engines', () => {
  it('lists every public page in the sitemap', () => {
    const sitemap = readFileSync(resolve(process.cwd(), 'public/sitemap.xml'), 'utf8');
    const listed = [...sitemap.matchAll(/<loc>https:\/\/www\.wera-jobs\.com\/([^<]*)<\/loc>/g)].map((m) => m[1]);
    for (const page of Object.keys(INFO_PAGES)) expect(listed, page).toContain(page);
    expect(listed).toContain('');
  });

  it('gives each page its canonical address and description, and restores them after', async () => {
    const meta = Object.assign(document.createElement('meta'), { name: 'description', content: 'site default' });
    document.head.appendChild(meta);
    const { unmount } = render('terms');
    await screen.findByRole('heading', { level: 2, name: 'The service' });
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.wera-jobs.com/terms');
    expect(meta.content).toBe(INFO_PAGES.terms.blurb);
    unmount();
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(meta.content).toBe('site default');
    meta.remove();
  });
});

describe('site footer', () => {
  it('links only to sections and pages that exist', () => {
    renderApp(<SiteFooter />);
    const links = screen.getAllByRole('link').map((a) => a.getAttribute('href') ?? '');
    expect(links.length).toBeGreaterThan(15);
    for (const href of links) expect(resolves(href), href).toBe(true);
    expect(links).not.toContain('/blog');
  });
});
