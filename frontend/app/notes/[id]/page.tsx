import { NoteEditor } from '@/features/edit-note';
import { RequireAuth } from '@/features/require-auth';

export default function NotePage({ params }: { params: { id: string } }) {
  return (
    <RequireAuth>
      <NoteEditor noteId={params.id} />
    </RequireAuth>
  );
}
