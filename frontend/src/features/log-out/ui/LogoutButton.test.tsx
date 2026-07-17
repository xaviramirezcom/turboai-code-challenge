import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getSession, setSession } from '@/entities/session';

import { logout } from '../api/logout';
import { LogoutButton } from './LogoutButton';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../api/logout', () => ({ logout: vi.fn() }));

const mockedLogout = vi.mocked(logout);

afterEach(() => {
  vi.clearAllMocks();
});

describe('LogoutButton', () => {
  it('calls the API, clears the session and returns to /login', async () => {
    // covers logout (resolved open question)
    const user = userEvent.setup();
    mockedLogout.mockResolvedValue(null);
    setSession({ id: 1, email: 'a@b.com' }, 'tok');

    render(<LogoutButton />);
    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(mockedLogout).toHaveBeenCalled();
    expect(getSession()).toBeNull();
    expect(push).toHaveBeenCalledWith('/login');
  });
});
