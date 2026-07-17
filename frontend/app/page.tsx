import { redirect } from 'next/navigation';

export default function HomePage() {
  // The board route guards itself, bouncing unauthenticated users to /login.
  redirect('/board');
}
