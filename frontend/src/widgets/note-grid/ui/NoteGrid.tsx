'use client';

import { NoteCard } from '@/entities/note';

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
}

/** Masonry grid of note cards (3.1–3.5) with loading/empty states (5.1). */
export function NoteGrid({ categoryId, onOpen }: NoteGridProps) {
  const { notes, loading, error } = useNotes(categoryId);

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
        <NoteCard key={note.id} note={note} onOpen={() => onOpen(note.id)} />
      ))}
    </div>
  );
}
