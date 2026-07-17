'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Category } from '@/entities/category';
import { listCategories } from '@/entities/category';
import type { Note } from '@/entities/note';
import { getNote, updateNote } from '@/entities/note';

/** Autosave debounce (criterion 2.1 — ~500ms of quiet before persisting). */
export const AUTOSAVE_MS = 500;

interface Draft {
  title: string;
  content: string;
}

export interface NoteEditorState {
  note: Note | null;
  categories: Category[];
  title: string;
  content: string;
  saving: boolean;
  saveError: boolean;
  error: boolean;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  changeCategory: (categoryId: number) => Promise<void>;
  flushNow: () => Promise<void>;
}

export function useNoteEditor(noteId: string): NoteEditorState {
  const [note, setNote] = useState<Note | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [error, setError] = useState(false);

  const noteRef = useRef<Note | null>(null);
  const draftRef = useRef<Draft>({ title: '', content: '' });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

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
    Promise.all([getNote(noteId), listCategories()])
      .then(([loaded, cats]) => {
        if (active) setLoaded(loaded, cats);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [noteId, setLoaded]);

  // Persist the current draft. A single in-flight guard ensures at most one
  // PATCH is ever outstanding; keystrokes that land during a save are picked up
  // by the tail re-flush once it resolves, so nothing is lost (criterion 2.3)
  // and requests never race out of order.
  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (inFlight.current) return;
    const current = noteRef.current;
    if (!current) return;
    const draft = draftRef.current;
    if (draft.title === current.title && draft.content === current.content) {
      return; // nothing changed since the last save
    }

    inFlight.current = true;
    setSaving(true);
    let saved = false;
    try {
      const result = await updateNote(current.id, draft);
      noteRef.current = result;
      setNote(result);
      setSaveError(false);
      saved = true;
    } catch {
      setSaveError(true);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }

    if (saved) {
      const base = noteRef.current;
      const after = draftRef.current;
      if (
        base &&
        (after.title !== base.title || after.content !== base.content)
      ) {
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

  const changeCategory = useCallback(async (categoryId: number) => {
    const current = noteRef.current;
    if (!current || categoryId === current.category_id) return;
    setSaving(true);
    try {
      const result = await updateNote(current.id, { category_id: categoryId });
      noteRef.current = result;
      setNote(result);
      setSaveError(false);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    note,
    categories,
    title,
    content,
    saving,
    saveError,
    error,
    onTitleChange,
    onContentChange,
    changeCategory,
    flushNow,
  };
}
