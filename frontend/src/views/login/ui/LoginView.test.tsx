import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LoginView } from './LoginView';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe('LoginView', () => {
  it('shows the "Yay, You\'re Back!" heading', () => {
    // covers 2.1
    render(<LoginView />);
    expect(
      screen.getByRole('heading', { name: "Yay, You're Back!" }),
    ).toBeInTheDocument();
  });

  it('links to the signup screen', () => {
    // covers 3.1
    render(<LoginView />);
    const link = screen.getByRole('link', {
      name: "Oops! I've never been here before",
    });
    expect(link).toHaveAttribute('href', '/signup');
  });
});
