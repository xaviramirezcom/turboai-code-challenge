'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Category } from '@/entities/category';
import { listCategories } from '@/entities/category';
import type { Note } from '@/entities/note';
import { createNote, getNote, updateNote } from '@/entities/note';
import { enqueue } from '@/features/offline-sync';
import { ApiError } from '@/shared/api';
import { getOnline, getSessionId } from '@/shared/lib';

/** Autosave debounce (criterion 2.1 — ~500ms of quiet before persisting). */
export const AUTOSAVE_MS = 500;

interface Draft {
  title: string;
  content: string;
}

function opId(noteId: string): string {
  return `${noteId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function pickDefault(cats: Category[]): Category | undefined {
  return cats.find((c) => c.is_default) ?? cats[0];
}

export interface NoteEditorState {
  note: Note | null;
  categories: Category[];
  title: string;
  content: string;
  saving: boolean;
  saveError: boolean;
  error: boolean;
  notice: string | null; // e.g. "changed elsewhere" or "offline — queued"
  /** True once the note exists on the server (or was queued to be created).
   * A brand-new draft is false until its first keystroke persists it (1.2). */
  persisted: boolean;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  changeCategory: (categoryId: number) => Promise<void>;
  flushNow: () => Promise<void>;
}

/** Editor state + autosave. When `draft` is true the note is NOT fetched or
 * created up front (deferred creation, notes 1.1): the editor starts empty and
 * persists on the first keystroke (1.2); closing it still-empty persists nothing
 * (1.3). */
export function useNoteEditor(noteId: string, draft = false): NoteEditorState {
  const [note, setNote] = useState<Note | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [persisted, setPersisted] = useState(false);

  const noteRef = useRef<Note | null>(null);
  const draftRef = useRef<Draft>({ title: '', content: '' });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  // Read once: whether this note still needs its first POST (deferred creation).
  const unsavedRef = useRef(draft);
  const isDraftInit = useRef(draft);

  const setLoaded = useCallback((loaded: Note, cats: Category[]) => {
    noteRef.current = loaded;
    draftRef.current = { title: loaded.title, content: loaded.content };
    setNote(loaded);
    setTitle(loaded.title);
    setContent(loaded.content);
    setCategories(cats);
  }, []);

  useEffect(() => {
    let active = true;
    if (isDraftInit.current) {
      // Draft: don't fetch — build an empty in-memory note with the default
      // category so the editor renders and can create on first edit (1.1/1.2).
      listCategories()
        .then((cats) => {
          if (!active) return;
          const def = pickDefault(cats);
          const now = new Date().toISOString();
          const draftNote: Note = {
            id: noteId,
            title: '',
            content: '',
            category_id: def?.id ?? 0,
            category: def
              ? { id: def.id, name: def.name, color: def.color }
              : { id: 0, name: '', color: '#000000' },
            created_at: now,
            last_edited_at: now,
            version: 1,
            locked_by: null,
            lock_expires_at: null,
          };
          noteRef.current = draftNote;
          draftRef.current = { title: '', content: '' };
          setNote(draftNote);
          setCategories(cats);
        })
        .catch(() => {
          if (active) setError(true);
        });
    } else {
      Promise.all([getNote(noteId), listCategories()])
        .then(([loaded, cats]) => {
          if (active) {
            setLoaded(loaded, cats);
            setPersisted(true);
          }
        })
        .catch(() => {
          if (active) setError(true);
        });
    }
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [noteId, setLoaded]);

  // Persist the current draft. A single in-flight guard ensures at most one
  // request is ever outstanding; keystrokes that land during a save are picked
  // up by the tail re-flush once it resolves, so nothing is lost (2.3). A
  // still-unsaved note is created on its first non-empty flush (1.2); an empty
  // draft persists nothing (1.3).
  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (inFlight.current) return;
    let base = noteRef.current;
    if (!base) return;
    let draftNow = draftRef.current;

    const hasText = draftNow.title !== '' || draftNow.content !== '';
    if (unsavedRef.current && !hasText) return; // empty draft → create nothing (1.3)

    const unchanged =
      !unsavedRef.current &&
      draftNow.title === base.title &&
      draftNow.content === base.content;
    if (unchanged) return; // nothing changed since the last save

    inFlight.current = true;
    setSaving(true);
    let saved = false;
    try {
      // 1) Deferred creation: persist the note on its first real edit (1.2).
      if (unsavedRef.current) {
        try {
          const created = await createNote({
            id: base.id,
            categoryId: base.category_id,
          });
          noteRef.current = created;
          base = created;
          unsavedRef.current = false;
          setNote(created);
          setPersisted(true);
        } catch (err) {
          if (!getOnline() || !(err instanceof ApiError)) {
            // Offline: queue the create (idempotent by client id) — the text
            // patch below is queued too, so the draft syncs on reconnect.
            enqueue({
              opId: opId(base.id),
              kind: 'create',
              noteId: base.id,
              baseVersion: 1,
              editedAt: new Date().toISOString(),
              fields: { category_id: base.category_id },
            });
            unsavedRef.current = false;
            setPersisted(true);
          } else {
            setSaveError(true);
            return;
          }
        }
      }

      // 2) Persist the typed title/content.
      draftNow = draftRef.current;
      if (draftNow.title === base.title && draftNow.content === base.content) {
        saved = true; // creation alone captured the state
      } else {
        try {
          const result = await updateNote(
            base.id,
            { ...draftNow, base_version: base.version },
            getSessionId(),
          );
          noteRef.current = result;
          setNote(result);
          setSaveError(false);
          setNotice(null);
          saved = true;
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) {
            // Changed elsewhere (6.2): reload the server version and tell the user.
            const server = err.data as Note;
            noteRef.current = server;
            draftRef.current = { title: server.title, content: server.content };
            setNote(server);
            setTitle(server.title);
            setContent(server.content);
            setNotice(
              'This note changed elsewhere — reloaded the latest version.',
            );
          } else if (!getOnline() || !(err instanceof ApiError)) {
            enqueue({
              opId: opId(base.id),
              kind: 'patch',
              noteId: base.id,
              baseVersion: base.version,
              editedAt: new Date().toISOString(),
              fields: { title: draftNow.title, content: draftNow.content },
            });
            setNotice('Offline — changes saved locally.');
          } else {
            setSaveError(true);
          }
        }
      }
    } finally {
      inFlight.current = false;
      setSaving(false);
    }

    if (saved) {
      const b = noteRef.current;
      const after = draftRef.current;
      if (b && (after.title !== b.title || after.content !== b.content)) {
        await flush(); // coalesce edits that arrived during the request
      }
    }
  }, []);

  const schedule = useCallback(
    (next: Draft) => {
      draftRef.current = next;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void flush();
      }, AUTOSAVE_MS);
    },
    [flush],
  );

  const onTitleChange = useCallback(
    (value: string) => {
      setTitle(value);
      schedule({ ...draftRef.current, title: value });
    },
    [schedule],
  );

  const onContentChange = useCallback(
    (value: string) => {
      setContent(value);
      schedule({ ...draftRef.current, content: value });
    },
    [schedule],
  );

  // Best-effort final save; never throws so the caller can always navigate.
  const flushNow = useCallback(async () => {
    await flush();
  }, [flush]);

  const changeCategory = useCallback(
    async (categoryId: number) => {
      const current = noteRef.current;
      if (!current || categoryId === current.category_id) return;

      // Draft not yet persisted: just recolour in memory; the chosen category is
      // applied when the note is created on first edit (1.2).
      if (unsavedRef.current) {
        const cat = categories.find((c) => c.id === categoryId);
        const updated: Note = {
          ...current,
          category_id: categoryId,
          category: cat
            ? { id: cat.id, name: cat.name, color: cat.color }
            : current.category,
        };
        noteRef.current = updated;
        setNote(updated);
        return;
      }

      setSaving(true);
      try {
        const result = await updateNote(
          current.id,
          { category_id: categoryId, base_version: current.version },
          getSessionId(),
        );
        noteRef.current = result;
        setNote(result);
        setSaveError(false);
        setNotice(null);
      } catch (err) {
        if (!getOnline() || !(err instanceof ApiError)) {
          enqueue({
            opId: opId(current.id),
            kind: 'patch',
            noteId: current.id,
            baseVersion: current.version,
            editedAt: new Date().toISOString(),
            fields: { category_id: categoryId },
          });
          setNotice('Offline — changes saved locally.');
        } else {
          setSaveError(true);
        }
      } finally {
        setSaving(false);
      }
    },
    [categories],
  );

  return {
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
  };
}
