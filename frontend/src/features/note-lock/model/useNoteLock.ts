'use client';

import { useEffect, useState } from 'react';

import { heartbeatNote, lockNote, unlockNote } from '@/entities/note';
import { ApiError } from '@/shared/api';
import { getSessionId } from '@/shared/lib';

/** Client refreshes the lock at ~1/3 of the 30s server TTL (5.3). */
export const HEARTBEAT_MS = 10_000;

export type LockStatus = 'acquiring' | 'editing' | 'locked';

export interface NoteLock {
  status: LockStatus;
  /** True when another session holds the lock — the note is read-only (5.2). */
  readOnly: boolean;
}

/** Acquire the advisory lock on open, heartbeat while editing, release on close
 * (5.1, 5.3, 5.4). If another session holds it, the note becomes read-only (5.2).
 * A network failure is treated optimistically (offline editing is optimistic). */
export function useNoteLock(noteId: string): NoteLock {
  const [status, setStatus] = useState<LockStatus>('acquiring');

  useEffect(() => {
    const session = getSessionId();
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    lockNote(noteId, session)
      .then(() => {
        if (!active) return;
        setStatus('editing');
        timer = setInterval(() => {
          heartbeatNote(noteId, session).catch((error) => {
            if (error instanceof ApiError && error.status === 423) {
              // Lost the lock to another session — go read-only and stop
              // heartbeating so we can't silently re-acquire it when their
              // TTL lapses (5.2).
              setStatus('locked');
              if (timer) clearInterval(timer);
            }
          });
        }, HEARTBEAT_MS);
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 423) {
          setStatus('locked'); // held by another session (5.2)
        } else {
          setStatus('editing'); // offline/error → optimistic (can't hold a lock)
        }
      });

    return () => {
      active = false;
      if (timer) clearInterval(timer);
      void unlockNote(noteId, session).catch(() => {});
    };
  }, [noteId]);

  return { status, readOnly: status === 'locked' };
}
