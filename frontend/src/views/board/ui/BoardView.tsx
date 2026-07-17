'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { CreateNoteButton } from '@/features/create-note';
import { CategorySidebar } from '@/widgets/category-sidebar';
import { NoteGrid } from '@/widgets/note-grid';

/** The board: category sidebar + note grid, with a category filter (specs/board).
 * The empty state lives inside the grid; the sidebar + New Note always show. */
export function BoardView() {
  const router = useRouter();
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  // Bumped on delete so the sidebar re-fetches and its counts decrement (6.3).
  const [countsRefresh, setCountsRefresh] = useState(0);

  return (
    <main className="board">
      <header className="board__topbar">
        <CreateNoteButton />
      </header>
      <div className="board__body">
        <CategorySidebar
          activeId={activeCategoryId}
          onSelect={setActiveCategoryId}
          refreshKey={countsRefresh}
        />
        <NoteGrid
          categoryId={activeCategoryId}
          onOpen={(noteId) => router.push(`/notes/${noteId}`)}
          onDeleted={() => setCountsRefresh((n) => n + 1)}
        />
      </div>
    </main>
  );
}
