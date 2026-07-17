'use client';

import { useSession } from '@/entities/session';
import { CreateNoteButton } from '@/features/create-note';
import { LogoutButton } from '@/features/log-out';

/** Board the user lands on after auth (criteria 1.2 / 2.2). The full sidebar +
 * note grid arrive with specs/board; the "+ New Note" action ships with notes. */
export function BoardView() {
  const session = useSession();

  return (
    <main className="board-screen">
      <header className="board-header">
        <h1 className="board-title">Your Notes</h1>
        <div className="board-actions">
          <CreateNoteButton />
          <LogoutButton />
        </div>
      </header>
      <p className="board-placeholder">
        Signed in as {session?.user.email}. The sidebar and note grid arrive
        with the board spec — for now, “+ New Note” opens the editor.
      </p>
    </main>
  );
}
