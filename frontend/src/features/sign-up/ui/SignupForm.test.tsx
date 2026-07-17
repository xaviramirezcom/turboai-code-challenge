import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearSession, getSession } from '@/entities/session';
import { ApiError } from '@/shared/api';

import { signup } from '../api/signup';
import { SignupForm } from './SignupForm';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../api/signup', () => ({ signup: vi.fn() }));

const mockedSignup = vi.mocked(signup);

afterEach(() => {
  vi.clearAllMocks();
  clearSession();
});

describe('SignupForm', () => {
  it('renders email, password and a Sign Up action', () => {
    // covers 1.1
    render(<SignupForm />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument();
  });

  it('creates the account, starts a session and routes to the board', async () => {
    // covers 1.2
    const user = userEvent.setup();
    mockedSignup.mockResolvedValue({
      token: 'tok',
      user: { id: 2, email: 'new@friend.com' },
    });
    render(<SignupForm />);

    await user.type(screen.getByLabelText('Email'), 'new@friend.com');
    await user.type(screen.getByLabelText('Password'), 's3cure-pw!');
    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    expect(mockedSignup).toHaveBeenCalledWith('new@friend.com', 's3cure-pw!');
    expect(getSession()?.user.email).toBe('new@friend.com');
    expect(push).toHaveBeenCalledWith('/board');
  });

  it('shows a field error for an already-registered email', async () => {
    // covers 1.3
    const user = userEvent.setup();
    mockedSignup.mockRejectedValue(
      new ApiError(400, { email: ['This email is already registered.'] }),
    );
    render(<SignupForm />);

    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('Password'), 's3cure-pw!');
    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    expect(
      await screen.findByText('This email is already registered.'),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('shows a field error when the password fails policy', async () => {
    // covers 1.3
    const user = userEvent.setup();
    mockedSignup.mockRejectedValue(
      new ApiError(400, { password: ['This password is too short.'] }),
    );
    render(<SignupForm />);

    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    expect(
      await screen.findByText('This password is too short.'),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
