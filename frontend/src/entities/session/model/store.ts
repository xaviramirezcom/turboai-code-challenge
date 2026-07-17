'use client';

import { useSyncExternalStore } from 'react';

import { setAuthToken } from '@/shared/api';

import type { Session, SessionUser } from './types';

// Persisted to sessionStorage (per-tab, cleared on tab close) so a page reload
// keeps the user signed in — the "in-memory + rehydrate" design decision.
// sessionStorage (not localStorage) narrows the token's exposure window.
const STORAGE_KEY = 'turbo.session';

let current: Session | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function persist(session: Session | null): void {
  if (typeof window === 'undefined') return;
  if (session) {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
}

/** Start an authenticated session and hand the token to the HTTP client. */
export function setSession(user: SessionUser, token: string): void {
  current = { user, token };
  setAuthToken(token);
  persist(current);
  emit();
}

/** End the session (logout) and clear the token from the HTTP client. */
export function clearSession(): void {
  current = null;
  setAuthToken(null);
  persist(null);
  emit();
}

/** Restore a persisted session on client load (called once by SessionProvider). */
export function rehydrate(): void {
  if (typeof window === 'undefined' || current) return;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Session;
    if (parsed?.token && parsed?.user) {
      current = parsed;
      setAuthToken(parsed.token);
      emit();
    }
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function getSession(): Session | null {
  return current;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, getSession, () => null);
}
