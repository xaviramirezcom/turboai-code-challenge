'use client';

import { useEffect, useRef, useState } from 'react';

import type { Category } from '@/entities/category';
import type { NoteCategory } from '@/entities/note';

function ChevronDown() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

interface CategorySelectProps {
  categories: Category[];
  current: NoteCategory;
  onSelect: (categoryId: number) => void;
}

/** Editor category dropdown (criteria 3.1, 3.2) — dot + name + chevron. */
export function CategorySelect({
  categories,
  current,
  onSelect,
}: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  return (
    <div className="cat-select" ref={ref}>
      <button
        type="button"
        className="cat-select__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span
          className="cat-select__dot"
          style={{ backgroundColor: current.color }}
        />
        <span className="cat-select__name">{current.name}</span>
        <span className="cat-select__chevron">
          <ChevronDown />
        </span>
      </button>

      {open ? (
        <ul className="cat-select__menu" role="listbox">
          {categories.map((category) => (
            <li
              key={category.id}
              role="option"
              aria-selected={category.id === current.id}
            >
              <button
                type="button"
                className="cat-select__option"
                onClick={() => {
                  onSelect(category.id);
                  setOpen(false);
                }}
              >
                <span
                  className="cat-select__dot"
                  style={{ backgroundColor: category.color }}
                />
                {category.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
