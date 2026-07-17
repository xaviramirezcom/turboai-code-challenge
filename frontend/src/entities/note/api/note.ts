import { api } from '@/shared/api';

import type { LockState, Note, NotePatch } from '../model/types';

interface CreateOptions {
  id?: string; // client UUID for idempotent offline create (3.4)
  categoryId?: number;
}

export function createNote(options: CreateOptions = {}): Promise<Note> {
  const body: Record<string, unknown> = {};
  if (options.id) body.id = options.id;
  if (options.categoryId) body.category_id = options.categoryId;
  return api.post<Note>('/notes/', body);
}

export function getNote(id: string): Promise<Note> {
  return api.get<Note>(`/notes/${id}/`);
}

/** PATCH a note. `patch.base_version` drives optimistic concurrency (6.2);
 * `sessionId` identifies the editing session for the advisory lock (5.2). */
export function updateNote(
  id: string,
  patch: NotePatch,
  sessionId?: string,
): Promise<Note> {
  const headers = sessionId ? { 'X-Session-Id': sessionId } : undefined;
  return api.patch<Note>(`/notes/${id}/`, patch, { headers });
}

export function listNotes(categoryId?: number): Promise<Note[]> {
  const query = categoryId ? `?category=${categoryId}` : '';
  return api.get<Note[]>(`/notes/${query}`);
}

/** Delta pull for sync (3.1): notes edited after `sinceIso`. */
export function listNotesSince(sinceIso: string): Promise<Note[]> {
  return api.get<Note[]>(`/notes/?since=${encodeURIComponent(sinceIso)}`);
}

export function deleteNote(id: string): Promise<null> {
  return api.del<null>(`/notes/${id}/`);
}

// --- Advisory lock (5.x) ---------------------------------------------

export function lockNote(id: string, sessionId: string): Promise<LockState> {
  return api.post<LockState>(`/notes/${id}/lock/`, undefined, {
    headers: { 'X-Session-Id': sessionId },
  });
}

export function heartbeatNote(
  id: string,
  sessionId: string,
): Promise<LockState> {
  return api.post<LockState>(`/notes/${id}/lock/heartbeat/`, undefined, {
    headers: { 'X-Session-Id': sessionId },
  });
}

export function unlockNote(id: string, sessionId: string): Promise<null> {
  return api.post<null>(`/notes/${id}/unlock/`, undefined, {
    headers: { 'X-Session-Id': sessionId },
  });
}
