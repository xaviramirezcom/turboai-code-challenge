import type { Conflict, Op } from './types';

const OUTBOX_KEY = 'turbo.outbox';
const CONFLICTS_KEY = 'turbo.conflicts';

function load<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, items: T[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(items));
}

export const loadOutbox = (): Op[] => load<Op>(OUTBOX_KEY);
export const saveOutbox = (ops: Op[]): void => save(OUTBOX_KEY, ops);
export const loadConflicts = (): Conflict[] => load<Conflict>(CONFLICTS_KEY);
export const saveConflicts = (c: Conflict[]): void => save(CONFLICTS_KEY, c);
