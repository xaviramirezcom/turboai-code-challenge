import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearSession, setSession } from '@/entities/session';

import { BoardView } from './BoardView';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

afterEach(() => clearSession());

describe('BoardView', () => {
  it('shows the signed-in email and a logout control', () => {
    // covers 1.2 / 2.2 — the landing screen after auth
    setSession({ id: 1, email: 'a@b.com' }, 'tok');

    render(<BoardView />);

    expect(screen.getByText(/a@b.com/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
  });
});
