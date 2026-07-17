import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { heartbeatNote, lockNote, unlockNote } from '@/entities/note';
import { ApiError } from '@/shared/api';

import { HEARTBEAT_MS, RETRY_MS, useNoteLock } from './useNoteLock';

vi.mock('@/entities/note', () => ({
  lockNote: vi.fn(),
  heartbeatNote: vi.fn(),
  unlockNote: vi.fn(),
}));
const mockedLock = vi.mocked(lockNote);
const mockedUnlock = vi.mocked(unlockNote);
vi.mocked(heartbeatNote).mockResolvedValue({
  locked_by: 'me',
  lock_expires_at: null,
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('useNoteLock', () => {
  it('is editable when the lock is acquired', async () => {
    // covers 5.1
    mockedLock.mockResolvedValue({ locked_by: 'me', lock_expires_at: null });
    mockedUnlock.mockResolvedValue(null);

    const { result } = renderHook(() => useNoteLock('n1'));

    await waitFor(() => expect(result.current.status).toBe('editing'));
    expect(result.current.readOnly).toBe(false);
  });

  it('becomes read-only when another session holds the lock (423)', async () => {
    // covers 5.2
    mockedLock.mockRejectedValue(new ApiError(423, { locked_by: 'other' }));
    mockedUnlock.mockResolvedValue(null);

    const { result } = renderHook(() => useNoteLock('n1'));

    await waitFor(() => expect(result.current.readOnly).toBe(true));
  });

  it('stays editable (optimistic) when the lock call fails offline', async () => {
    mockedLock.mockRejectedValue(new Error('network'));
    mockedUnlock.mockResolvedValue(null);

    const { result } = renderHook(() => useNoteLock('n1'));

    await waitFor(() => expect(result.current.status).toBe('editing'));
  });

  it('goes read-only and stops heartbeating if a heartbeat is rejected (423)', async () => {
    // covers 5.2/5.3 — losing the lock mid-session must not keep heartbeating
    // (the first call acquires; while locked, re-acquire attempts stay 423)
    mockedLock
      .mockResolvedValueOnce({ locked_by: 'me', lock_expires_at: null })
      .mockRejectedValue(new ApiError(423, { locked_by: 'other' }));
    mockedUnlock.mockResolvedValue(null);
    vi.mocked(heartbeatNote).mockRejectedValue(
      new ApiError(423, { locked_by: 'other' }),
    );
    vi.useFakeTimers();

    const { result } = renderHook(() => useNoteLock('n1'));
    // let the initial lock promise resolve so the heartbeat interval is armed
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.status).toBe('editing');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(HEARTBEAT_MS); // first heartbeat → 423
    });
    expect(result.current.readOnly).toBe(true);

    const callsAfterFirst = vi.mocked(heartbeatNote).mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 3); // no further beats
    });
    expect(vi.mocked(heartbeatNote).mock.calls.length).toBe(callsAfterFirst);
  });

  it('recovers to editable when the other session releases the lock (5.4)', async () => {
    // regression: a read-only tab must not stay stuck after the editing tab
    // closes — the next poll re-acquires the freed lock
    mockedLock
      .mockRejectedValueOnce(new ApiError(423, { locked_by: 'other' }))
      .mockResolvedValue({ locked_by: 'me', lock_expires_at: null });
    mockedUnlock.mockResolvedValue(null);
    vi.mocked(heartbeatNote).mockResolvedValue({
      locked_by: 'me',
      lock_expires_at: null,
    });
    vi.useFakeTimers();

    const { result } = renderHook(() => useNoteLock('n1'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0); // initial acquire → 423 (locked)
    });
    expect(result.current.readOnly).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(RETRY_MS); // poll → lock now free → acquired
    });
    expect(result.current.status).toBe('editing');
    expect(result.current.readOnly).toBe(false);
  });

  it('does not touch the lock while disabled, then acquires when enabled (draft)', async () => {
    // covers 5.1 for deferred creation — no lock attempt until the note exists
    mockedLock.mockResolvedValue({ locked_by: 'me', lock_expires_at: null });
    mockedUnlock.mockResolvedValue(null);

    const { result, rerender } = renderHook(
      ({ enabled }) => useNoteLock('n1', enabled),
      { initialProps: { enabled: false } },
    );
    // disabled: no lock/heartbeat/unlock calls, and the note stays editable
    expect(mockedLock).not.toHaveBeenCalled();
    expect(result.current.readOnly).toBe(false);

    rerender({ enabled: true }); // draft persisted → acquire now
    await waitFor(() => expect(result.current.status).toBe('editing'));
    expect(mockedLock).toHaveBeenCalledWith('n1', expect.any(String));
  });

  it('releases the lock on unmount', async () => {
    // covers 5.4
    mockedLock.mockResolvedValue({ locked_by: 'me', lock_expires_at: null });
    mockedUnlock.mockResolvedValue(null);

    const { result, unmount } = renderHook(() => useNoteLock('n1'));
    await waitFor(() => expect(result.current.status).toBe('editing'));

    unmount();
    expect(mockedUnlock).toHaveBeenCalledWith('n1', expect.any(String));
  });
});
