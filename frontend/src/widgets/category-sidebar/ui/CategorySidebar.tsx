'use client';

import { useCategories } from '../model/useCategories';

interface CategorySidebarProps {
  activeId: number | null; // null = "All Categories"
  onSelect: (categoryId: number | null) => void;
  /** Bumped by the view to re-fetch counts after a delete (board 6.3). */
  refreshKey?: number;
}

/** Left sidebar: All Categories + each category with a colour dot and note
 * count; selecting one sets the active filter (criteria 1.1, 1.2, 2.1–2.3). */
export function CategorySidebar({
  activeId,
  onSelect,
  refreshKey,
}: CategorySidebarProps) {
  const { categories, loading, error } = useCategories(refreshKey);

  return (
    <nav className="sidebar" aria-label="Categories">
      <button
        type="button"
        className={`sidebar__row sidebar__row--all${activeId === null ? ' is-active' : ''}`}
        aria-current={activeId === null}
        onClick={() => onSelect(null)}
      >
        All Categories
      </button>

      {loading ? (
        <p className="sidebar__loading">Loading…</p>
      ) : error ? (
        <p className="sidebar__loading" role="alert">
          Couldn’t load categories.
        </p>
      ) : (
        categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`sidebar__row${activeId === category.id ? ' is-active' : ''}`}
            aria-current={activeId === category.id}
            onClick={() => onSelect(category.id)}
          >
            <span
              className="sidebar__dot"
              style={{ backgroundColor: category.color }}
            />
            <span className="sidebar__name">{category.name}</span>
            <span className="sidebar__count">{category.note_count}</span>
          </button>
        ))
      )}
    </nav>
  );
}
