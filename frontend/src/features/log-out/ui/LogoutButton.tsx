'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { clearSession } from '@/entities/session';

import { logout } from '../api/logout';

/** Logs out: invalidates the server token, clears the session, returns to login. */
export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      await logout();
    } catch {
      // Even if the server call fails, clear locally so the user is logged out.
    } finally {
      clearSession();
      router.push('/login');
    }
  }

  return (
    <button
      type="button"
      className="logout-button"
      onClick={handleClick}
      disabled={busy}
    >
      Log out
    </button>
  );
}
