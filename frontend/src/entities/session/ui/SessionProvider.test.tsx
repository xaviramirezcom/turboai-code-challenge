import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { clearSession, getSession } from '@/entities/session';

import { SessionProvider } from './SessionProvider';

afterEach(() => {
  clearSession();
});

describe('SessionProvider', () => {
  it('rehydrates a persisted session and renders its children', () => {
    // covers 4.1 — reload/new-tab persistence, wired at the app root
    window.localStorage.setItem(
      'turbo.session',
      JSON.stringify({ user: { id: 1, email: 'a@b.com' }, token: 'tk' }),
    );

    render(
      <SessionProvider>
        <p>protected content</p>
      </SessionProvider>,
    );

    expect(screen.getByText('protected content')).toBeInTheDocument();
    expect(getSession()?.token).toBe('tk');
  });
});
