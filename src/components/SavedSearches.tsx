// Saved Jobs searches: a bar on the Jobs page to save the current filters
// and reopen or delete saved ones, and a list under Jobs in the sidebar.
import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { BookmarkPlus, Search, X } from 'lucide-react';
import clsx from 'clsx';
import { useDeleteSearch, useSaveSearch, useSavedSearches } from '../api/hooks';
import { filterQuery } from '../lib/searches';
import { toast } from '../lib/toast';

export function SavedSearchBar() {
  const { search } = useLocation();
  const { data } = useSavedSearches();
  const save = useSaveSearch();
  const del = useDeleteSearch();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const current = filterQuery(search);
  const searches = data?.searches ?? [];
  const already = searches.some((s) => s.query === current);
  if (!current && searches.length === 0) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    save.mutate(
      { name: name.trim(), query: current },
      {
        onSuccess: () => {
          setNaming(false);
          setName('');
          toast.success('Search saved. Reopen it from here or the sidebar.');
        },
      },
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Saved searches" role="group">
      {searches.map((s) => (
        <span
          key={s.id}
          className={clsx(
            'inline-flex items-center rounded-full border text-xs font-medium',
            s.query === current ? 'border-accent/50 bg-accent/10 text-accent' : 'border-border bg-surface text-muted',
          )}
        >
          <Link to={`/jobs${s.query ? `?${s.query}` : ''}`} className="py-1 pr-1 pl-3 hover:text-text">
            {s.name}
          </Link>
          <button type="button" aria-label={`Delete saved search ${s.name}`} onClick={() => del.mutate(s.id)} className="rounded-full p-1 pr-2 text-faint hover:text-bad">
            <X className="size-3" />
          </button>
        </span>
      ))}
      {current && !already && !naming && (
        <button
          type="button"
          onClick={() => setNaming(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium text-muted hover:border-accent/40 hover:text-accent"
        >
          <BookmarkPlus className="size-3.5" /> Save this search
        </button>
      )}
      {naming && (
        <form onSubmit={submit} className="inline-flex items-center gap-1.5">
          <input
            autoFocus
            aria-label="Name for this search"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setNaming(false)}
            maxLength={60}
            placeholder="Name it, like Remote data roles"
            className="w-56 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-text placeholder:text-faint focus:border-accent/60 focus:outline-none"
          />
          <button type="submit" disabled={save.isPending || !name.trim()} className="rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-bg hover:bg-accent/85 disabled:opacity-60">
            Save
          </button>
          <button type="button" onClick={() => setNaming(false)} className="px-1 text-xs text-muted hover:text-text">
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}

/** Saved searches under Jobs in the sidebar. */
export function SidebarSearches() {
  const { data } = useSavedSearches();
  const { pathname, search } = useLocation();
  const searches = data?.searches ?? [];
  if (searches.length === 0) return null;
  const current = pathname === '/jobs' ? filterQuery(search) : null;
  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-faint uppercase">Saved searches</div>
      {searches.map((s) => (
        <NavLink
          key={s.id}
          to={`/jobs${s.query ? `?${s.query}` : ''}`}
          className={clsx(
            'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            current === s.query ? 'text-accent' : 'text-muted hover:bg-surface-2 hover:text-text',
          )}
        >
          <Search className="size-3.5 shrink-0" />
          <span className="truncate">{s.name}</span>
        </NavLink>
      ))}
    </div>
  );
}
