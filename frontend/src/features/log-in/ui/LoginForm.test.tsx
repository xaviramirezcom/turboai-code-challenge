import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearSession, getSession } from '@/entities/session';
import { ApiError } from '@/shared/api';

import { login } from '../api/login';
import { LoginForm } from './LoginForm';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../api/login', () => ({ login: vi.fn() }));

const mockedLogin = vi.mocked(login);

afterEach(() => {
  vi.clearAllMocks();
  clearSession();
});

describe('LoginForm', () => {
  it('renders email, password and a Login action', () => {
    // covers 2.1
    render(<LoginForm />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('logs in, starts a session and routes to the board', async () => {
    // covers 2.2
    const user = userEvent.setup();
    mockedLogin.mockResolvedValue({
      token: 'tok',
      user: { id: 1, email: 'a@b.com' },
    });
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('Password'), 's3cure-pw!');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(mockedLogin).toHaveBeenCalledWith('a@b.com', 's3cure-pw!');
    expect(getSession()?.token).toBe('tok');
    expect(push).toHaveBeenCalledWith('/board');
  });

  it('shows an error and does not navigate on bad credentials', async () => {
    // covers 2.3
    const user = userEvent.setup();
    mockedLogin.mockRejectedValue(new ApiError(401, { detail: 'no' }));
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-pass');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(
      await screen.findByText('Invalid email or password.'),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(getSession()).toBeNull();
  });
});
