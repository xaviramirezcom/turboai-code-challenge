import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SignupView } from './SignupView';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe('SignupView', () => {
  it('shows the "Yay, New Friend!" heading', () => {
    // covers 1.1
    render(<SignupView />);
    expect(
      screen.getByRole('heading', { name: 'Yay, New Friend!' }),
    ).toBeInTheDocument();
  });

  it('links to the login screen', () => {
    // covers 3.1
    render(<SignupView />);
    const link = screen.getByRole('link', { name: "We're already friends!" });
    expect(link).toHaveAttribute('href', '/login');
  });
});
