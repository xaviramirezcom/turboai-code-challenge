import { NoteEditor } from '@/features/edit-note';
import { RequireAuth } from '@/features/require-auth';

export default function NotePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { new?: string };
}) {
  return (
    <RequireAuth>
      <NoteEditor noteId={params.id} draft={searchParams?.new === '1'} />
    </RequireAuth>
  );
}
