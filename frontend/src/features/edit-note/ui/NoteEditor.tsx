'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

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

/** Full-screen note editor (criteria 1.2–1.4, 2.1–2.4, 3.1–3.3, 4.1). When
 * `draft` is set the note is created on the first keystroke (deferred creation);
 * once persisted the `?new=1` flag is dropped so a reload loads the saved note. */
export function NoteEditor({
  noteId,
  draft = false,
}: {
  noteId: string;
  draft?: boolean;
}) {
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
    persisted,
    onTitleChange,
    onContentChange,
    changeCategory,
    flushNow,
  } = useNoteEditor(noteId, draft);
  // A draft note doesn't exist server-side until its first keystroke — only
  // acquire the advisory lock once it's persisted (notes 1.1/1.2).
  const { readOnly } = useNoteLock(noteId, !draft || persisted);
  const presenceCount = usePresence(noteId);

  // Once a draft is persisted, drop `?new=1` so a reload loads the saved note
  // instead of starting a fresh draft (notes design — deferred creation).
  const droppedNew = useRef(false);
  useEffect(() => {
    if (draft && persisted && !droppedNew.current) {
      droppedNew.current = true;
      router.replace(`/notes/${noteId}`);
    }
  }, [draft, persisted, noteId, router]);

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
