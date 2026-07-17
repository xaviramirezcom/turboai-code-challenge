'use client';

import { useEffect, useState } from 'react';

import { getRealtimeClient } from '@/shared/api/realtime';
import { getSessionId } from '@/shared/lib';

/** Number of sessions currently present on a note (4.1, 4.2). Returns 0 when
 * Supabase Realtime isn't configured (the client no-ops). */
export function usePresence(noteId: string): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const client = getRealtimeClient();
    if (!client.enabled) return;
    const handle = client.joinNote(noteId, getSessionId(), (sessions) => {
      setCount(sessions.length);
    });
    return () => {
      void handle.leave();
    };
  }, [noteId]);

  return count;
}
