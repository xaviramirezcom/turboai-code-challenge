'use client';

import { useRouter } from 'next/navigation';

import { newId } from '@/shared/lib';

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

/** "New Note" — opens an empty draft editor at a fresh client id WITHOUT
 * persisting (criterion 1.1). The draft is saved on the first keystroke by the
 * editor (1.2); the `new=1` flag tells the editor to start as a draft. */
export function CreateNoteButton() {
  const router = useRouter();

  function handleClick() {
    router.push(`/notes/${newId()}?new=1`);
  }

  return (
    <button type="button" className="new-note-button" onClick={handleClick}>
      <span className="new-note-button__icon">
        <PlusIcon />
      </span>
      New Note
    </button>
  );
}
