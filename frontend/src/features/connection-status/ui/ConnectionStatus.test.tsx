import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useSyncState } from '@/features/offline-sync';
import { setOnline } from '@/shared/lib';

import { ConnectionStatus } from './ConnectionStatus';

vi.mock('@/features/offline-sync', () => ({
  useSyncState: vi.fn(() => ({ status: 'idle', pending: 0 })),
}));
const mockedSync = vi.mocked(useSyncState);

afterEach(() => {
  setOnline(true);
  vi.clearAllMocks();
});

describe('ConnectionStatus', () => {
  it('shows a persistent offline banner when offline', () => {
    // covers 1.2
    setOnline(false);
    render(<ConnectionStatus />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Offline — changes saved locally',
    );
  });

  it('shows "syncing" when back online and flushing', () => {
    // covers 1.3
    setOnline(true);
    mockedSync.mockReturnValue({ status: 'syncing', pending: 1 });
    render(<ConnectionStatus />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Back online — syncing…',
    );
  });

  it('renders nothing when online and idle', () => {
    setOnline(true);
    mockedSync.mockReturnValue({ status: 'idle', pending: 0 });
    const { container } = render(<ConnectionStatus />);
    expect(container).toBeEmptyDOMElement();
  });
});
