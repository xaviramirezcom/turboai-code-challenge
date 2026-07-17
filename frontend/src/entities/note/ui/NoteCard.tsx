'use client';

import { formatRelativeDate, withAlpha } from '@/shared/lib';

import type { Note } from '../model/types';

/** Board preview card (board 3.1–3.5). Background = category colour at 50%
 * alpha with a solid 3px border of the full colour (Figma card 2:39). */
export function NoteCard({
  note,
  onOpen,
}: {
  note: Note;
  onOpen?: () => void;
}) {
  const { color, name } = note.category;
  return (
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
  );
}
