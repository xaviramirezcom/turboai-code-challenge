'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

import { useSession, useSessionReady } from '@/entities/session';

/** Client route guard: unauthenticated users are sent to /login (criterion 4.1).
 * Waits for session rehydration before redirecting, so a refresh doesn't bounce
 * an authenticated user to /login while the persisted session is being restored. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSession();
  const ready = useSessionReady();
  const router = useRouter();

  useEffect(() => {
    if (ready && !session) {
      router.replace('/login');
    }
  }, [ready, session, router]);

  if (!ready || !session) {
    return null;
  }
  return <>{children}</>;
}
