'use client';

import { useCallback, useEffect, useState } from 'react';

import { deleteNote, listNotes, type Note } from '@/entities/note';

export interface NotesState {
  notes: Note[];
  loading: boolean;
  error: boolean;
  /** Delete a note (DELETE → 204) then drop its card; resolves false and keeps
   * the card if the request fails, so nothing is lost silently (board 6.3/6.5). */
  remove: (id: string) => Promise<boolean>;
}

/** Notes for the active filter (null = all), ordered by the API (-last_edited). */
export function useNotes(categoryId: number | null): NotesState {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    listNotes(categoryId ?? undefined)
      .then((result) => {
        if (active) {
          setNotes(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [categoryId]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteNote(id); // 204 (6.3)
      setNotes((current) => current.filter((n) => n.id !== id));
      return true;
    } catch {
      return false; // keep the card on failure (6.5)
    }
  }, []);

  return { notes, loading, error, remove };
}
