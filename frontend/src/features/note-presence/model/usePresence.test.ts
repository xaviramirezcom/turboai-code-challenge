import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { _setRealtimeClient, type RealtimeClient } from '@/shared/api/realtime';

import { usePresence } from './usePresence';

afterEach(() => _setRealtimeClient(null));

describe('usePresence', () => {
  it('returns 0 when Realtime is not configured (no-op client)', () => {
    // covers graceful degrade without Supabase
    _setRealtimeClient({
      enabled: false,
      joinNote: () => ({ leave: async () => {} }),
    });
    const { result } = renderHook(() => usePresence('n1'));
    expect(result.current).toBe(0);
  });

  it('reflects the number of present sessions', () => {
    // covers 4.1
    let notify: ((sessions: string[]) => void) | undefined;
    const fake: RealtimeClient = {
      enabled: true,
      joinNote: (_noteId, _sessionId, onPresence) => {
        notify = onPresence;
        return { leave: async () => {} };
      },
    };
    _setRealtimeClient(fake);

    const { result } = renderHook(() => usePresence('n1'));
    act(() => notify?.(['session-a', 'session-b']));

    expect(result.current).toBe(2);
  });

  it('leaves the channel on unmount (4.2)', () => {
    let left = false;
    _setRealtimeClient({
      enabled: true,
      joinNote: () => ({
        leave: async () => {
          left = true;
        },
      }),
    });

    const { unmount } = renderHook(() => usePresence('n1'));
    unmount();
    expect(left).toBe(true);
  });
});
