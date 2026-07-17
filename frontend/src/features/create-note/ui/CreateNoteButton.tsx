'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createNote } from '@/entities/note';

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** "New Note" — creates a note immediately and opens it (criterion 1.1). */
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
      <span className="new-note-button__icon">
        <PlusIcon />
      </span>
      New Note
    </button>
  );
}
