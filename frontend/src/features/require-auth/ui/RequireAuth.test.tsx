import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearSession, setSession } from '@/entities/session';

import { RequireAuth } from './RequireAuth';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

afterEach(() => {
  vi.clearAllMocks();
  clearSession();
});

describe('RequireAuth', () => {
  it('redirects to /login and hides content when unauthenticated', () => {
    // covers 4.1
    render(
      <RequireAuth>
        <p>secret board</p>
      </RequireAuth>,
    );

    expect(replace).toHaveBeenCalledWith('/login');
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
