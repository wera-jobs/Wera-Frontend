import { useState } from 'react';
import { STAGGER_MAX_MS } from '../lib/styles';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { MessageCircle, PenSquare, Search, Users } from 'lucide-react';
import { usePosts } from '../api/community';
import { Avatar } from '../components/Avatar';
import { Reactions } from '../components/Reactions';
import { EmptyState, ErrorState, SkeletonRows } from '../components/States';
import { EXAMPLE_POSTS } from '../data/examplePosts';
import { errorMessage } from '../api/client';
import { relTime } from '../lib/format';
import { useDocumentTitle } from '../lib/useDocumentTitle';

export default function CommunityPage() {
  useDocumentTitle('Community');
  const [sp, setSp] = useSearchParams();
  const tag = sp.get('tag') ?? '';
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'newest' | 'discussed' | 'helpful'>('newest');
  const feed = usePosts(tag);

  const needle = query.trim().toLowerCase();
  const matchingExamples = EXAMPLE_POSTS.filter((p) => !tag || p.tags.includes(tag));
  const mergedTags = (() => {
    const counts = new Map<string, number>();
    for (const t of feed.data?.tags ?? []) counts.set(t.tag, t.count);
    for (const p of EXAMPLE_POSTS) {
      for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ tag: name, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  })();
  const visiblePosts = [...(feed.data?.posts ?? []), ...matchingExamples]
    .filter((p) => !needle || `${p.title} ${p.excerpt} ${p.tags.join(' ')} ${p.author.name}`.toLowerCase().includes(needle))
    .sort((a, b) => {
      if (sort === 'discussed') return b.comment_count - a.comment_count;
      if (sort === 'helpful') {
        const sum = (r: Record<string, number>) => Object.values(r).reduce((n, v) => n + v, 0);
        return sum(b.reactions) - sum(a.reactions);
      }
      return b.created_at.localeCompare(a.created_at);
    });

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold">Community</h1>
          <p className="mt-1 max-w-lg text-sm text-muted">
            Offers, interview trends and hard-won tips from people in the same search. Every post is reviewed before it
            goes live.
          </p>
        </div>
        <Link
          to="/community/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-bg transition-colors hover:bg-accent/85"
        >
          <PenSquare className="size-4" /> Write a post
        </Link>
      </header>

      {!!mergedTags.length && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {[{ tag: '', count: 0 }, ...mergedTags].map((t) => (
            <button
              key={t.tag || 'all'}
              onClick={() => setSp(t.tag ? { tag: t.tag } : {})}
              className={clsx(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150',
                tag === t.tag ? 'border-accent/40 bg-accent/10 text-accent' : 'border-border text-muted hover:text-text',
              )}
            >
              {t.tag ? `#${t.tag}` : 'All posts'}
              {t.count > 0 && <span className="ml-1 text-faint">{t.count}</span>}
            </button>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative min-w-48 flex-1">
          <span className="sr-only">Search posts</span>
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts, companies, tags…"
            className="w-full rounded-lg border border-border bg-surface py-1.5 pr-2.5 pl-8 text-xs text-text placeholder:text-faint focus:border-accent/60 focus:outline-none"
          />
        </label>
        <div role="group" aria-label="Sort posts" className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-xs">
          {(
            [
              ['newest', 'Newest'],
              ['discussed', 'Most discussed'],
              ['helpful', 'Most helpful'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={sort === k}
              onClick={() => setSort(k)}
              className={clsx('rounded-md px-2.5 py-1 font-medium transition-colors', sort === k ? 'bg-accent/10 text-accent' : 'text-muted hover:text-text')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {feed.isLoading ? (
        <SkeletonRows rows={4} />
      ) : feed.isLoadingError ? (
        <ErrorState message={errorMessage(feed.error)} onRetry={() => void feed.refetch()} />
      ) : !visiblePosts.length ? (
        <EmptyState
          icon={<Users className="size-6 text-faint" />}
          title={needle ? `No posts match “${query}”` : tag ? `No posts tagged #${tag} yet` : 'No posts yet'}
          hint="Landed an offer or learned something in an interview loop? Be the first to share it."
        />
      ) : (
        <ul className="space-y-3">
          {visiblePosts.map((p, i) => (
            <li key={p.id} className="anim-rise" style={{ animationDelay: `${Math.min(i * 40, STAGGER_MAX_MS)}ms` }}>
              <Link
                to={`/community/${p.slug ?? p.id}`}
                className="group block rounded-card border border-border bg-surface p-5 transition-all duration-200 hover:-translate-y-px hover:border-accent/30 hover:shadow-[var(--shadow-card-hover)]"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <Avatar user={p.author} size={22} self={false} />
                  <span className="font-medium text-text">{p.author.name}</span>
                  <span className="text-faint">· {relTime(p.created_at)} · {p.read_minutes} min read</span>
                  {p.is_example && (
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted">Example</span>
                  )}
                </div>
                <h2 className="font-serif text-xl leading-snug font-semibold text-text transition-colors group-hover:text-accent">
                  {p.title}
                </h2>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{p.excerpt.replace(/[#*`]/g, '')}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {p.tags.map((t) => (
                    <span key={t} className="text-xs text-faint">#{t}</span>
                  ))}
                  <span className="ml-auto flex items-center gap-3">
                    <Reactions post={p} compact />
                    <span className="inline-flex items-center gap-1 text-xs text-muted">
                      <MessageCircle className="size-3.5" /> {p.comment_count}
                    </span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
