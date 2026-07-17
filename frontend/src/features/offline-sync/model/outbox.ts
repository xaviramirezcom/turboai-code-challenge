'use client';

import { useSyncExternalStore } from 'react';

import { createNote, type Note, updateNote } from '@/entities/note';
import { ApiError } from '@/shared/api';
import { getOnline } from '@/shared/lib';

import {
  loadConflicts,
  loadOutbox,
  saveConflicts,
  saveOutbox,
} from './storage';
import type { Conflict, Op, SyncStatus } from './types';

let outbox: Op[] = loadOutbox();
let conflicts: Conflict[] = loadConflicts();
let syncStatus: SyncStatus = 'idle';
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function setStatus(next: SyncStatus): void {
  syncStatus = next;
  emit();
}

/** Queue an offline mutation (2.2, 2.3). Idempotent on opId (3.4). */
export function enqueue(op: Op): void {
  if (outbox.some((existing) => existing.opId === op.opId)) return;
  outbox = [...outbox, op];
  saveOutbox(outbox);
  emit();
}

export function getPendingCount(): number {
  return outbox.length;
}

export function getSyncStatus(): SyncStatus {
  return syncStatus;
}

export function useSyncState(): { status: SyncStatus; pending: number } {
  return useSyncExternalStore(
    subscribe,
    () => ({ status: syncStatus, pending: outbox.length }),
    () => ({ status: 'idle' as SyncStatus, pending: 0 }),
  );
}

export function getConflicts(): Conflict[] {
  return conflicts;
}

async function reconcile(op: Op, server: Note): Promise<void> {
  if (op.editedAt > server.last_edited_at) {
    // Local edit is newer → last-write-wins: re-apply against the current version.
    try {
      await updateNote(op.noteId, {
        ...op.fields,
        base_version: server.version,
      });
    } catch {
      // If it still conflicts, fall through to preserving the losing copy.
      conflicts = [
        ...conflicts,
        { noteId: op.noteId, losing: op.fields, editedAt: op.editedAt },
      ];
      saveConflicts(conflicts);
    }
  } else {
    // Server edit is newer → keep server, preserve the losing local copy (3.2).
    conflicts = [
      ...conflicts,
      { noteId: op.noteId, losing: op.fields, editedAt: op.editedAt },
    ];
    saveConflicts(conflicts);
  }
}

async function pushOp(op: Op): Promise<'done' | 'retry'> {
  try {
    if (op.kind === 'create') {
      await createNote({ id: op.noteId, categoryId: op.fields.category_id });
    } else {
      await updateNote(op.noteId, {
        ...op.fields,
        base_version: op.baseVersion,
      });
    }
    return 'done';
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      await reconcile(op, error.data as Note);
      return 'done'; // conflict resolved — drop the op
    }
    return 'retry'; // offline/server error — keep it queued for later
  }
}

/** Flush the outbox in order, reconciling on 409 (3.1–3.4). No-op when offline
 * or empty. Idempotent: pushed ops are removed; a client-UUID create replayed
 * against the server is a no-op there too. */
export async function flush(): Promise<void> {
  if (!getOnline() || outbox.length === 0) return;
  setStatus('syncing');
  const remaining: Op[] = [];
  for (const op of outbox) {
    if ((await pushOp(op)) === 'retry') remaining.push(op);
  }
  outbox = remaining;
  saveOutbox(outbox);
  setStatus('synced');
}

/** Test-only reset of the in-memory + persisted state. */
export function _resetOutbox(): void {
  outbox = [];
  conflicts = [];
  syncStatus = 'idle';
  saveOutbox(outbox);
  saveConflicts(conflicts);
  emit();
}
