import { afterEach, describe, expect, it } from 'vitest';

import { getAuthToken } from '@/shared/api';

import {
  _resetSession,
  clearSession,
  getSession,
  rehydrate,
  setSession,
} from './store';

afterEach(() => {
  clearSession();
});

describe('entities/session store', () => {
  it('setSession stores the user and attaches the token to the HTTP client', () => {
    // covers 4.1
    setSession({ id: 1, email: 'a@b.com' }, 'tok-123');

    expect(getSession()).toEqual({
      user: { id: 1, email: 'a@b.com' },
      token: 'tok-123',
    });
    expect(getAuthToken()).toBe('tok-123');
  });

  it('clearSession removes the session and the token (logout)', () => {
    // covers 4.1
    setSession({ id: 1, email: 'a@b.com' }, 'tok-123');

    clearSession();

    expect(getSession()).toBeNull();
    expect(getAuthToken()).toBeNull();
  });

  it('persists across a reload and new tabs: rehydrate restores from localStorage', () => {
    // covers 4.1 — the login is shared across tabs (design: localStorage + rehydrate)
    setSession({ id: 9, email: 'x@y.com' }, 'persisted-tok');
    // Simulate a fresh tab/reload: in-memory state is gone but localStorage remains.
    _resetSession();
    window.localStorage.setItem(
      'turbo.session',
      JSON.stringify({
        user: { id: 9, email: 'x@y.com' },
        token: 'persisted-tok',
      }),
    );

    rehydrate();

    expect(getSession()).toEqual({
      user: { id: 9, email: 'x@y.com' },
      token: 'persisted-tok',
    });
    expect(getAuthToken()).toBe('persisted-tok');
  });

  it('setSession writes to localStorage so other tabs can pick it up', () => {
    // covers 4.1 — cross-tab login sharing
    setSession({ id: 3, email: 'c@d.com' }, 'tok-xyz');
    const raw = window.localStorage.getItem('turbo.session');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).token).toBe('tok-xyz');
  });
});
