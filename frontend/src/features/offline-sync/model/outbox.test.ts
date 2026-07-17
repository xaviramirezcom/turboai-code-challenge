import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createNote, updateNote } from '@/entities/note';
import { ApiError } from '@/shared/api';
import { setOnline } from '@/shared/lib';

import { loadConflicts, loadOutbox } from './storage';
import type { Op } from './types';

vi.mock('@/entities/note', () => ({
  createNote: vi.fn(),
  updateNote: vi.fn(),
}));
const mockedCreate = vi.mocked(createNote);
const mockedUpdate = vi.mocked(updateNote);

// Import after mocks so the module's api references are mocked.
import {
  _getSyncSnapshot,
  _resetOutbox,
  enqueue,
  flush,
  getConflicts,
} from './outbox';

function patchOp(over: Partial<Op> = {}): Op {
  return {
    opId: `op-${Math.random()}`,
    kind: 'patch',
    noteId: 'note-1',
    baseVersion: 1,
    editedAt: '2024-07-21T20:00:00.000Z',
    fields: { title: 'offline edit' },
    ...over,
  };
}

const serverNote = (over: Record<string, unknown>) => ({
  id: 'note-1',
  title: 'server',
  content: '',
  category_id: 1,
  category: { id: 1, name: 'Random Thoughts', color: '#EF9C66' },
  created_at: '2024-07-21T19:00:00.000Z',
  last_edited_at: '2024-07-21T20:00:00.000Z',
  version: 5,
  locked_by: null,
  lock_expires_at: null,
  ...over,
});

beforeEach(() => {
  window.localStorage.clear();
  _resetOutbox();
  setOnline(true);
  vi.clearAllMocks();
});

afterEach(() => setOnline(true));

describe('offline outbox', () => {
  it('persists a queued op to localStorage so it survives a reload', () => {
    // covers 2.2, 2.3
    const op = patchOp();
    enqueue(op);
    const persisted = loadOutbox();
    expect(persisted).toHaveLength(1);
    expect(persisted[0]?.noteId).toBe('note-1');
    expect(persisted[0]?.baseVersion).toBe(1);
  });

  it('getSnapshot returns a stable reference until state changes (no render loop)', () => {
    // regression: a fresh object each call makes useSyncExternalStore loop
    // ("Maximum update depth exceeded")
    const first = _getSyncSnapshot();
    expect(_getSyncSnapshot()).toBe(first); // same ref, unchanged state

    enqueue(patchOp());
    const afterEnqueue = _getSyncSnapshot();
    expect(afterEnqueue).not.toBe(first); // new ref, pending changed
    expect(afterEnqueue.pending).toBe(1);
    expect(_getSyncSnapshot()).toBe(afterEnqueue); // stable again
  });

  it('is idempotent on opId — enqueuing the same op twice keeps one', () => {
    // covers 3.4
    const op = patchOp({ opId: 'same' });
    enqueue(op);
    enqueue(op);
    expect(loadOutbox()).toHaveLength(1);
  });

  it('flush replays a queued patch with its base_version, then clears it', async () => {
    // covers 3.1, 3.3
    mockedUpdate.mockResolvedValue(serverNote({}));
    enqueue(patchOp({ fields: { content: 'synced' } }));

    await flush();

    expect(mockedUpdate).toHaveBeenCalledWith(
      'note-1',
      expect.objectContaining({ content: 'synced', base_version: 1 }),
    );
    expect(loadOutbox()).toHaveLength(0);
  });

  it('does nothing while offline', async () => {
    setOnline(false);
    enqueue(patchOp());
    await flush();
    expect(mockedUpdate).not.toHaveBeenCalled();
    expect(loadOutbox()).toHaveLength(1); // kept for later
  });

  it('on 409 with a newer server edit, keeps the losing local copy', async () => {
    // covers 3.2 — server wins, nothing silently lost
    mockedUpdate.mockRejectedValue(
      new ApiError(
        409,
        serverNote({ last_edited_at: '2024-07-21T21:00:00.000Z' }),
      ),
    );
    enqueue(patchOp({ fields: { title: 'my losing edit' } }));

    await flush();

    expect(loadOutbox()).toHaveLength(0); // resolved (dropped)
    const conflicts = getConflicts();
    expect(conflicts.at(-1)?.losing.title).toBe('my losing edit');
    expect(loadConflicts()).toHaveLength(1); // preserved on disk
  });

  it('on 409 with an older server edit, re-applies (last-write-wins local)', async () => {
    // covers 3.2 — local newer wins
    mockedUpdate
      .mockRejectedValueOnce(
        new ApiError(
          409,
          serverNote({ last_edited_at: '2024-07-21T19:30:00.000Z' }),
        ),
      )
      .mockResolvedValueOnce(serverNote({ title: 'my winning edit' }));
    enqueue(patchOp({ fields: { title: 'my winning edit' } }));

    await flush();

    // second call re-applies against the current server version (5)
    expect(mockedUpdate).toHaveBeenLastCalledWith(
      'note-1',
      expect.objectContaining({ base_version: 5, title: 'my winning edit' }),
    );
    expect(getConflicts()).toHaveLength(0);
  });

  it('replays an offline create with the client UUID', async () => {
    // covers 3.4 — offline create keeps its id
    mockedCreate.mockResolvedValue(serverNote({}));
    enqueue(patchOp({ kind: 'create', noteId: 'client-uuid', fields: {} }));

    await flush();

    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'client-uuid' }),
    );
  });
});
