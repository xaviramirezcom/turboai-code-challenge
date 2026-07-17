import { RequireAuth } from '@/features/require-auth';
import { BoardView } from '@/views/board';

export default function BoardPage() {
  return (
    <RequireAuth>
      <BoardView />
    </RequireAuth>
  );
}
