'use client';

import { useSyncExternalStore } from 'react';

import { setAuthToken } from '@/shared/api';

import type { Session, SessionUser } from './types';

// Persisted to localStorage so the login is shared across every tab of this
// browser: open a new tab and you stay signed in (no re-login). The advisory
// edit-lock uses a *separate*, per-tab id in sessionStorage (see shared/lib
// getSessionId) so two tabs of the same user still contend for a note's lock.
const STORAGE_KEY = 'turbo.session';

let current: Session | null = null;
// Whether a rehydrate attempt has run yet. The route guard must wait for this
// before deciding someone is logged out — otherwise a refresh redirects to
// /login before the persisted session is restored.
let hydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function persist(session: Session | null): void {
  if (typeof window === 'undefined') return;
  if (session) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

/** Start an authenticated session and hand the token to the HTTP client. */
export function setSession(user: SessionUser, token: string): void {
  current = { user, token };
  hydrated = true; // a definitive session — the guard can trust it immediately
  setAuthToken(token);
  persist(current);
  emit();
}

/** End the session (logout) and clear the token from the HTTP client. */
export function clearSession(): void {
  current = null;
  hydrated = true; // definitively logged out — let the guard redirect
  setAuthToken(null);
  persist(null);
  emit();
}

/** Restore a persisted session on client load (called once by SessionProvider). */
export function rehydrate(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && !current) {
      const parsed = JSON.parse(raw) as Session;
      if (parsed?.token && parsed?.user) {
        current = parsed;
        setAuthToken(parsed.token);
      }
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  } finally {
    // Mark hydration attempted even when there was nothing to restore, so the
    // guard can now trust that a null session means "logged out".
    hydrated = true;
    emit();
  }
}

export function getSession(): Session | null {
  return current;
}

function getHydrated(): boolean {
  return hydrated;
}

/** True once a rehydrate attempt has completed. The route guard waits on this
 * before treating a null session as logged-out. */
export function useSessionReady(): boolean {
  return useSyncExternalStore(subscribe, getHydrated, () => false);
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

/** Test-only reset to the pristine pre-hydration state. */
export function _resetSession(): void {
  current = null;
  hydrated = false;
  setAuthToken(null);
  emit();
}
