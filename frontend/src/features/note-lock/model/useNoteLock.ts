'use client';

import { useEffect, useState } from 'react';

import { heartbeatNote, lockNote, unlockNote } from '@/entities/note';
import { ApiError } from '@/shared/api';
import { getSessionId } from '@/shared/lib';

/** Client refreshes the lock at ~1/3 of the 30s server TTL (5.3). */
export const HEARTBEAT_MS = 10_000;
/** While another session holds the lock, re-check this often so this tab
 * becomes editable again as soon as they release it (or their lock expires) —
 * without this a read-only tab stays stuck after the editing tab closes (5.4). */
export const RETRY_MS = 5_000;

export type LockStatus = 'acquiring' | 'editing' | 'locked';

export interface NoteLock {
  status: LockStatus;
  /** True when another session holds the lock — the note is read-only (5.2). */
  readOnly: boolean;
}

/** Acquire the advisory lock on open, heartbeat while editing, release on close
 * (5.1, 5.3, 5.4). If another session holds it, the note becomes read-only (5.2)
 * and this tab keeps polling so it recovers once the lock frees. A network
 * failure is treated optimistically (offline editing is optimistic).
 *
 * `enabled` gates acquisition: pass false while the note doesn't exist yet (an
 * unsaved draft, notes 1.1) — the lock is (re-)acquired once it flips true, so a
 * freshly-created note gets locked without a reload. */
export function useNoteLock(noteId: string, enabled = true): NoteLock {
  const [status, setStatus] = useState<LockStatus>('acquiring');

  useEffect(() => {
    if (!enabled) return; // note doesn't exist yet — nothing to lock
    const session = getSessionId();
    let active = true;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let retry: ReturnType<typeof setInterval> | null = null;

    const clear = (t: ReturnType<typeof setInterval> | null): null => {
      if (t) clearInterval(t);
      return null;
    };

    function startHeartbeat(): void {
      if (heartbeat) return;
      heartbeat = setInterval(() => {
        heartbeatNote(noteId, session).catch((error) => {
          if (error instanceof ApiError && error.status === 423) {
            // Lost the lock to another session — go read-only, stop
            // heartbeating, and poll to recover when it frees again (5.2).
            setStatus('locked');
            heartbeat = clear(heartbeat);
            startRetry();
          }
        });
      }, HEARTBEAT_MS);
    }

    function startRetry(): void {
      if (retry) return;
      retry = setInterval(acquire, RETRY_MS);
    }

    function acquire(): void {
      lockNote(noteId, session)
        .then(() => {
          if (!active) return;
          retry = clear(retry);
          setStatus('editing');
          startHeartbeat();
        })
        .catch((error) => {
          if (!active) return;
          if (error instanceof ApiError && error.status === 423) {
            setStatus('locked'); // held by another session (5.2)
            startRetry(); // recover once they release it
          } else {
            setStatus('editing'); // offline/error → optimistic
          }
        });
    }

    acquire();

    // Closing the browser tab doesn't run React cleanup, so release the lock on
    // pagehide with a keepalive request — otherwise a read-only tab waits out
    // the full server TTL before it can take over (5.4).
    const releaseOnHide = (): void => {
      void unlockNote(noteId, session, true).catch(() => {});
    };
    window.addEventListener('pagehide', releaseOnHide);

    return () => {
      active = false;
      heartbeat = clear(heartbeat);
      retry = clear(retry);
      window.removeEventListener('pagehide', releaseOnHide);
      void unlockNote(noteId, session).catch(() => {});
    };
  }, [noteId, enabled]);

  return { status, readOnly: status === 'locked' };
}
