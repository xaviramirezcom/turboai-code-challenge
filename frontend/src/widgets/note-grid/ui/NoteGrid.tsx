'use client';

import { NoteCard, type Note } from '@/entities/note';

import { useNotes } from '../model/useNotes';

function EmptyState() {
  return (
    <div className="note-empty">
      <img
        className="note-empty__art"
        src="/board/empty-boba.png"
        alt=""
        width={297}
        height={296}
      />
      <p className="note-empty__text">
        I&apos;m just here waiting for your charming notes…
      </p>
    </div>
  );
}

interface NoteGridProps {
  categoryId: number | null;
  onOpen: (noteId: string) => void;
  /** Called after a note is successfully deleted, so the view can refresh the
   * sidebar counts (board 6.3). */
  onDeleted?: (note: Note) => void;
}

/** Masonry grid of note cards (3.1–3.5) with loading/empty states (5.1) and a
 * hover-✕ delete per card (6.1–6.5). */
export function NoteGrid({ categoryId, onOpen, onDeleted }: NoteGridProps) {
  const { notes, loading, error, remove } = useNotes(categoryId);

  async function handleDelete(note: Note): Promise<void> {
    const label = note.title.trim() || 'this note';
    // Lightweight confirmation before deleting (6.2).
    if (!window.confirm(`Delete "${label}"? This can't be undone.`)) return;
    // The delete + optimistic removal live in the model (useNotes); the view
    // decrements the counts once it succeeds (6.3). A failure keeps the card (6.5).
    if (await remove(note.id)) onDeleted?.(note);
  }

  if (loading) {
    return <div className="note-grid__status">Loading your notes…</div>;
  }
  if (error) {
    return <div className="note-grid__status">Couldn’t load your notes.</div>;
  }
  if (notes.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="note-grid">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          onOpen={() => onOpen(note.id)}
          onDelete={() => void handleDelete(note)}
        />
      ))}
    </div>
  );
}
