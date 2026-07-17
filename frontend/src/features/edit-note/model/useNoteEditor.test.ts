import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { listCategories } from '@/entities/category';
import { createNote, getNote, updateNote } from '@/entities/note';

import { useNoteEditor } from './useNoteEditor';

vi.mock('@/entities/category', () => ({ listCategories: vi.fn() }));
vi.mock('@/entities/note', () => ({
  getNote: vi.fn(),
  createNote: vi.fn(),
  updateNote: vi.fn(),
}));
vi.mock('@/features/offline-sync', () => ({ enqueue: vi.fn() }));

const mockedCats = vi.mocked(listCategories);
const mockedGet = vi.mocked(getNote);
const mockedCreate = vi.mocked(createNote);
const mockedUpdate = vi.mocked(updateNote);

const CATS = [
  {
    id: 1,
    name: 'Random Thoughts',
    color: '#EF9C66',
    is_default: true,
    note_count: 0,
  },
  { id: 2, name: 'School', color: '#FCDC94', is_default: true, note_count: 0 },
];

function serverNote(over: Record<string, unknown> = {}) {
  return {
    id: 'n1',
    title: '',
    content: '',
    category_id: 1,
    category: { id: 1, name: 'Random Thoughts', color: '#EF9C66' },
    created_at: '2024-07-21T20:39:00',
    last_edited_at: '2024-07-21T20:39:00',
    version: 1,
    locked_by: null,
    lock_expires_at: null,
    ...over,
  };
}

afterEach(() => vi.clearAllMocks());

describe('useNoteEditor — deferred creation', () => {
  it('opens a draft without fetching or persisting anything (1.1)', async () => {
    mockedCats.mockResolvedValue(CATS);
    const { result } = renderHook(() => useNoteEditor('n1', true));

    await waitFor(() => expect(result.current.note).not.toBeNull());
    expect(mockedGet).not.toHaveBeenCalled(); // a draft never fetches
    expect(mockedCreate).not.toHaveBeenCalled(); // and never POSTs on open
    expect(result.current.persisted).toBe(false);
  });

  it('creates the note on the first keystroke, then saves the text (1.2)', async () => {
    mockedCats.mockResolvedValue(CATS);
    mockedCreate.mockResolvedValue(serverNote());
    mockedUpdate.mockResolvedValue(serverNote({ title: 'Hi', version: 2 }));
    const { result } = renderHook(() => useNoteEditor('n1', true));
    await waitFor(() => expect(result.current.note).not.toBeNull());

    act(() => result.current.onTitleChange('Hi'));
    await act(async () => {
      await result.current.flushNow();
    });

    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n1' }),
    );
    expect(mockedUpdate).toHaveBeenCalledWith(
      'n1',
      expect.objectContaining({ title: 'Hi' }),
      expect.any(String),
    );
    expect(result.current.persisted).toBe(true);
  });

  it('persists nothing when an empty draft is closed (1.3)', async () => {
    mockedCats.mockResolvedValue(CATS);
    const { result } = renderHook(() => useNoteEditor('n1', true));
    await waitFor(() => expect(result.current.note).not.toBeNull());

    await act(async () => {
      await result.current.flushNow(); // e.g. the close button flushes first
    });

    expect(mockedCreate).not.toHaveBeenCalled();
    expect(mockedUpdate).not.toHaveBeenCalled();
    expect(result.current.persisted).toBe(false);
  });

  it('applies a category chosen before the first edit at create time (1.2/3.2)', async () => {
    mockedCats.mockResolvedValue(CATS);
    mockedCreate.mockResolvedValue(serverNote({ category_id: 2 }));
    mockedUpdate.mockResolvedValue(
      serverNote({ title: 'Hi', category_id: 2, version: 2 }),
    );
    const { result } = renderHook(() => useNoteEditor('n1', true));
    await waitFor(() => expect(result.current.note).not.toBeNull());

    await act(async () => {
      await result.current.changeCategory(2); // recolour the still-unsaved draft
    });
    act(() => result.current.onTitleChange('Hi'));
    await act(async () => {
      await result.current.flushNow();
    });

    expect(mockedCreate).toHaveBeenCalledWith({ id: 'n1', categoryId: 2 });
  });

  it('loads an existing note normally when not a draft', async () => {
    mockedCats.mockResolvedValue(CATS);
    mockedGet.mockResolvedValue(serverNote({ title: 'Saved' }));
    const { result } = renderHook(() => useNoteEditor('n1', false));

    await waitFor(() => expect(result.current.persisted).toBe(true));
    expect(mockedGet).toHaveBeenCalledWith('n1');
    expect(result.current.title).toBe('Saved');
  });
});
