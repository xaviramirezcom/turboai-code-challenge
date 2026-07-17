'use client';

import { useSession } from '@/entities/session';
import { LogoutButton } from '@/features/log-out';

/** Placeholder board the user lands on after auth (criteria 1.2 / 2.2).
 * The full sidebar + note grid arrive with specs/board and specs/notes. */
export function BoardView() {
  const session = useSession();

  return (
    <main className="board-screen">
      <header className="board-header">
        <h1 className="board-title">Your Notes</h1>
        <LogoutButton />
      </header>
      <p className="board-placeholder">
        Signed in as {session?.user.email}. Your board — categories and notes —
        arrives with the next specs.
      </p>
    </main>
  );
}
