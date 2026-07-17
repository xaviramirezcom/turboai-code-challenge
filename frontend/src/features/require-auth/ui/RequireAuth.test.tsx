import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetSession, rehydrate, setSession } from '@/entities/session';

import { RequireAuth } from './RequireAuth';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

beforeEach(() => {
  _resetSession(); // pristine pre-hydration state (as on a fresh page load)
  window.localStorage.clear();
});

afterEach(() => {
  cleanup(); // unmount so a lingering guard can't redirect during the next test
  vi.clearAllMocks();
});

describe('RequireAuth', () => {
  it('redirects to /login and hides content when unauthenticated', () => {
    // covers 4.1
    rehydrate(); // page loaded with no stored session → hydration done, no user

    render(
      <RequireAuth>
        <p>secret board</p>
      </RequireAuth>,
    );

    expect(replace).toHaveBeenCalledWith('/login');
    expect(screen.queryByText('secret board')).not.toBeInTheDocument();
  });

  it('does not redirect before rehydration completes (avoids the refresh bounce)', () => {
    // regression: the guard must wait for the persisted session to be restored
    window.localStorage.setItem(
      'turbo.session',
      JSON.stringify({ user: { id: 1, email: 'a@b.com' }, token: 'tok' }),
    );
    // Note: rehydrate() has NOT run yet — mimics the first render after refresh.

    render(
      <RequireAuth>
        <p>secret board</p>
      </RequireAuth>,
    );

    expect(replace).not.toHaveBeenCalled(); // no premature bounce
    expect(screen.queryByText('secret board')).not.toBeInTheDocument();
  });

  it('renders children when a session exists', () => {
    // covers 4.1
    setSession({ id: 1, email: 'a@b.com' }, 'tok');

    render(
      <RequireAuth>
        <p>secret board</p>
      </RequireAuth>,
    );

    expect(screen.getByText('secret board')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
