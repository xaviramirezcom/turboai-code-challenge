import { afterEach, describe, expect, it } from 'vitest';

import { getAuthToken } from '@/shared/api';

import { clearSession, getSession, rehydrate, setSession } from './store';

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

  it('persists across a reload: rehydrate restores the session and token', () => {
    // covers 4.1 — the session survives a page reload (design: in-memory + rehydrate)
    setSession({ id: 9, email: 'x@y.com' }, 'persisted-tok');
    // Simulate a reload: the in-memory state is gone but sessionStorage remains.
    clearSession();
    window.sessionStorage.setItem(
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
});
