'use client';

import { useEffect, useState } from 'react';

import { listNotes, type Note } from '@/entities/note';

export interface NotesState {
  notes: Note[];
  loading: boolean;
  error: boolean;
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

  return { notes, loading, error };
}
