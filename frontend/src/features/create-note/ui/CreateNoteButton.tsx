'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createNote } from '@/entities/note';

/** "+ New Note" — creates a note immediately and opens it (criterion 1.1). */
export function CreateNoteButton() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function handleClick() {
    setCreating(true);
    try {
      const note = await createNote();
      router.push(`/notes/${note.id}`);
    } catch {
      setCreating(false);
    }
  }

  return (
    <button
      type="button"
      className="new-note-button"
      onClick={handleClick}
      disabled={creating}
    >
      + New Note
    </button>
  );
}
