'use client';

import { useSyncExternalStore } from 'react';

import { API_BASE_URL } from '@/shared/config';

let online =
  typeof navigator !== 'undefined' && 'onLine' in navigator
    ? navigator.onLine
    : true;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function setOnline(next: boolean): void {
  if (online !== next) {
    online = next;
    emit();
  }
}

export function getOnline(): boolean {
  return online;
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getOnline, () => true);
}

/** Heartbeat to the unauthenticated health endpoint (1.1). Never throws. */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health/`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

/** Wire browser online/offline events + a periodic health poll into the store.
 * Returns a stop function. */
export function startConnectivityMonitor(intervalMs = 15000): () => void {
  const goOnline = (): void => setOnline(true);
  const goOffline = (): void => setOnline(false);
  window.addEventListener('online', goOnline);
  window.addEventListener('offline', goOffline);

  const poll = (): void => {
    void checkHealth().then(setOnline);
  };
  poll();
  const timer = window.setInterval(poll, intervalMs);

  return () => {
    window.removeEventListener('online', goOnline);
    window.removeEventListener('offline', goOffline);
    window.clearInterval(timer);
  };
}
