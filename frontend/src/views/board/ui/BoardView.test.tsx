import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { listCategories } from '@/entities/category';
import { deleteNote, listNotes, type Note } from '@/entities/note';

import { BoardView } from './BoardView';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/entities/category', () => ({ listCategories: vi.fn() }));
vi.mock('@/entities/note', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/note')>()),
  listNotes: vi.fn(),
  createNote: vi.fn(),
  deleteNote: vi.fn(),
}));

const mockedCats = vi.mocked(listCategories);
const mockedNotes = vi.mocked(listNotes);
const mockedDelete = vi.mocked(deleteNote);

const CATS = [
  {
    id: 1,
    name: 'Random Thoughts',
    color: '#EF9C66',
    is_default: true,
    note_count: 1,
  },
  { id: 2, name: 'School', color: '#FCDC94', is_default: true, note_count: 0 },
];

const NOTE: Note = {
  id: 'n1',
  title: 'Grocery List',
  content: 'Milk',
  category_id: 1,
  category: { id: 1, name: 'Random Thoughts', color: '#EF9C66' },
  created_at: '2024-07-21T20:39:00',
  last_edited_at: '2024-07-21T20:39:00',
  version: 1,
  locked_by: null,
  lock_expires_at: null,
};

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('BoardView', () => {
  it('renders New Note, the sidebar and the note grid', async () => {
    // covers 1.1, 3.1
    mockedCats.mockResolvedValue(CATS);
    mockedNotes.mockResolvedValue([NOTE]);
    render(<BoardView />);

    expect(
      screen.getByRole('button', { name: 'New Note' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'All Categories' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Grocery List')).toBeInTheDocument();
  });

  it('filters the grid when a category is selected', async () => {
    // covers 2.1 end-to-end (sidebar → grid)
    mockedCats.mockResolvedValue(CATS);
    mockedNotes.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<BoardView />);

    await waitFor(() => expect(mockedNotes).toHaveBeenCalledWith(undefined));
    await user.click(await screen.findByRole('button', { name: /School 0/ }));
    await waitFor(() => expect(mockedNotes).toHaveBeenCalledWith(2));
  });

  it('re-fetches the sidebar counts after deleting a note (6.3)', async () => {
    mockedCats.mockResolvedValue(CATS);
    mockedNotes.mockResolvedValue([NOTE]);
    mockedDelete.mockResolvedValue(null);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<BoardView />);

    await screen.findByText('Grocery List');
    await waitFor(() => expect(mockedCats).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: /delete note/i }));

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith('n1'));
    // counts re-fetch (decrement) and the card is gone
    await waitFor(() => expect(mockedCats).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.queryByText('Grocery List')).not.toBeInTheDocument(),
    );
  });

  it('shows the empty state alongside the sidebar and New Note', async () => {
    // covers 5.1 — empty state while the sidebar + New Note remain
    mockedCats.mockResolvedValue(CATS);
    mockedNotes.mockResolvedValue([]);
    render(<BoardView />);

    expect(
      await screen.findByText(/waiting for your charming notes/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'All Categories' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'New Note' }),
    ).toBeInTheDocument();
  });
});
