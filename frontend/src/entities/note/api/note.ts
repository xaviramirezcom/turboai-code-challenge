import { api } from '@/shared/api';

import type { Note, NotePatch } from '../model/types';

export function createNote(categoryId?: number): Promise<Note> {
  return api.post<Note>(
    '/notes/',
    categoryId ? { category_id: categoryId } : {},
  );
}

export function getNote(id: string): Promise<Note> {
  return api.get<Note>(`/notes/${id}/`);
}

export function updateNote(id: string, patch: NotePatch): Promise<Note> {
  return api.patch<Note>(`/notes/${id}/`, patch);
}

export function listNotes(categoryId?: number): Promise<Note[]> {
  const query = categoryId ? `?category=${categoryId}` : '';
  return api.get<Note[]>(`/notes/${query}`);
}

export function deleteNote(id: string): Promise<null> {
  return api.del<null>(`/notes/${id}/`);
}
