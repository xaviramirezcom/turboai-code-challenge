'use client';

import { formatRelativeDate, withAlpha } from '@/shared/lib';

import type { Note } from '../model/types';

/** ✕ mirroring the editor's close control (board Req 6 — not in Figma). */
function DeleteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** Board preview card (board 3.1–3.5). Background = category colour at 50%
 * alpha with a solid 3px border of the full colour (Figma card 2:39). When
 * `onDelete` is given, a hover/focus-revealed ✕ deletes the note without
 * opening it (board 6.1/6.3) — the ✕ is a sibling of the card button so it
 * never triggers the card's open click. */
export function NoteCard({
  note,
  onOpen,
  onDelete,
}: {
  note: Note;
  onOpen?: () => void;
  onDelete?: () => void;
}) {
  const { color, name } = note.category;
  return (
    <div className="note-card-wrap">
      <button
        type="button"
        className="note-card"
        onClick={onOpen}
        style={{ backgroundColor: withAlpha(color, 0.5), borderColor: color }}
      >
        <span className="note-card__meta">
          <span className="note-card__date">
            {formatRelativeDate(note.last_edited_at)}
          </span>
          <span className="note-card__category">{name}</span>
        </span>
        <span className="note-card__title">{note.title}</span>
        <span className="note-card__preview">{note.content}</span>
      </button>
      {onDelete ? (
        <button
          type="button"
          className="note-card__delete"
          aria-label="Delete note"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
        >
          <DeleteIcon />
        </button>
      ) : null}
    </div>
  );
}
