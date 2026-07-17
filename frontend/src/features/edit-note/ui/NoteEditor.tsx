'use client';

import { useRouter } from 'next/navigation';

import { useNoteLock } from '@/features/note-lock';
import { usePresence } from '@/features/note-presence';
import { formatEditedAt, withAlpha } from '@/shared/lib';

import { useNoteEditor } from '../model/useNoteEditor';
import { CategorySelect } from './CategorySelect';

function CloseIcon() {
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
      <path d="M5 5l14 14M19 5L5 19" />
    </svg>
  );
}

/** Full-screen note editor (criteria 1.3, 2.1–2.4, 3.1–3.3, 4.1). */
export function NoteEditor({ noteId }: { noteId: string }) {
  const router = useRouter();
  const {
    note,
    categories,
    title,
    content,
    saving,
    saveError,
    error,
    notice,
    onTitleChange,
    onContentChange,
    changeCategory,
    flushNow,
  } = useNoteEditor(noteId);
  const { readOnly } = useNoteLock(noteId);
  const presenceCount = usePresence(noteId);

  function status(lastEditedAt: string): string {
    if (saving) return 'Saving…';
    if (saveError) return "Couldn't save — will retry";
    return `Last Edited: ${formatEditedAt(lastEditedAt)}`;
  }

  async function close() {
    await flushNow();
    router.push('/board');
  }

  if (error) {
    return (
      <main className="editor-screen editor-screen--message">
        <p>That note could not be found.</p>
        <button
          type="button"
          className="logout-button"
          onClick={() => router.push('/board')}
        >
          Back to board
        </button>
      </main>
    );
  }

  if (!note) {
    return (
      <main className="editor-screen editor-screen--message">
        <p>Loading…</p>
      </main>
    );
  }

  const { color } = note.category;

  return (
    <main className="editor-screen">
      <div className="editor-bar">
        <CategorySelect
          categories={categories}
          current={note.category}
          onSelect={changeCategory}
          disabled={readOnly}
        />
        <div className="editor-bar__right">
          {presenceCount > 1 ? (
            <span className="editor-presence">{presenceCount} here</span>
          ) : null}
          <button
            type="button"
            className="editor-close"
            aria-label="Close note"
            onClick={close}
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {readOnly ? (
        <p className="editor-lock" role="alert">
          This note is being edited in another session — read only.
        </p>
      ) : null}

      <section
        className="editor-card"
        style={{ backgroundColor: withAlpha(color, 0.5), borderColor: color }}
      >
        <p className="editor-edited" aria-live="polite">
          {status(note.last_edited_at)}
        </p>
        {notice ? (
          <p className="editor-notice" role="status">
            {notice}
          </p>
        ) : null}
        <input
          className="editor-title"
          value={title}
          placeholder="Note Title"
          aria-label="Note title"
          readOnly={readOnly}
          onChange={(event) => onTitleChange(event.target.value)}
        />
        <textarea
          className="editor-content"
          value={content}
          placeholder="Pour your heart out…"
          aria-label="Note content"
          readOnly={readOnly}
          onChange={(event) => onContentChange(event.target.value)}
        />
      </section>
    </main>
  );
}
