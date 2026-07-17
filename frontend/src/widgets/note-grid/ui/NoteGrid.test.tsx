import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { deleteNote, listNotes, type Note } from '@/entities/note';

import { NoteGrid } from './NoteGrid';

vi.mock('@/entities/note', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/note')>()),
  listNotes: vi.fn(),
  deleteNote: vi.fn(),
}));
const mockedList = vi.mocked(listNotes);
const mockedDelete = vi.mocked(deleteNote);

function note(id: string, title: string): Note {
  return {
    id,
    title,
    content: `${title} body`,
    category_id: 1,
    category: { id: 1, name: 'Random Thoughts', color: '#EF9C66' },
    created_at: '2024-07-21T20:39:00',
    last_edited_at: '2024-07-21T20:39:00',
    version: 1,
    locked_by: null,
    lock_expires_at: null,
  };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('NoteGrid', () => {
  it('renders cards in the order returned by the API', async () => {
    // covers 3.5 (API orders by -last_edited_at)
    mockedList.mockResolvedValue([note('2', 'Second'), note('1', 'First')]);
    render(<NoteGrid categoryId={null} onOpen={() => {}} />);

    // filter by preview text so the per-card delete ✕ buttons aren't matched
    const cards = await screen.findAllByRole('button', { name: /body/ });
    expect(cards[0]).toHaveTextContent('Second');
    expect(cards[1]).toHaveTextContent('First');
  });

  it('opens the clicked note in the editor', async () => {
    // covers 3.4
    mockedList.mockResolvedValue([note('abc', 'Open me')]);
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(<NoteGrid categoryId={null} onOpen={onOpen} />);

    await user.click(await screen.findByRole('button', { name: /Open me/ }));
    expect(onOpen).toHaveBeenCalledWith('abc');
  });

  it('shows the empty state when there are no notes', async () => {
    // covers 5.1
    mockedList.mockResolvedValue([]);
    render(<NoteGrid categoryId={null} onOpen={() => {}} />);

    expect(
      await screen.findByText(/waiting for your charming notes/),
    ).toBeInTheDocument();
  });

  it('requests notes for the active category filter', async () => {
    // covers 2.1 (data path)
    mockedList.mockResolvedValue([]);
    render(<NoteGrid categoryId={7} onOpen={() => {}} />);
    await waitFor(() => expect(mockedList).toHaveBeenCalledWith(7));
  });

  it('shows an error state when notes fail to load', async () => {
    // covers grid error state
    mockedList.mockRejectedValue(new Error('500'));
    render(<NoteGrid categoryId={null} onOpen={() => {}} />);
    expect(
      await screen.findByText('Couldn’t load your notes.'),
    ).toBeInTheDocument();
  });

  it('confirms, deletes, removes the card and notifies the view (6.2, 6.3)', async () => {
    mockedList.mockResolvedValue([note('a', 'Alpha'), note('b', 'Beta')]);
    mockedDelete.mockResolvedValue(null);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onDeleted = vi.fn();
    const user = userEvent.setup();
    render(
      <NoteGrid categoryId={null} onOpen={() => {}} onDeleted={onDeleted} />,
    );
    await screen.findByText('Alpha');

    const [alphaDelete] = screen.getAllByRole('button', {
      name: /delete note/i,
    });
    if (!alphaDelete) throw new Error('expected a delete control');
    await user.click(alphaDelete);

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith('a'));
    await waitFor(() =>
      expect(screen.queryByText('Alpha')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Beta')).toBeInTheDocument(); // sibling untouched
    expect(onDeleted).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a' }),
    );
  });

  it('does not delete when the confirmation is cancelled (6.4)', async () => {
    mockedList.mockResolvedValue([note('a', 'Alpha')]);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    render(<NoteGrid categoryId={null} onOpen={() => {}} />);
    await screen.findByText('Alpha');

    await user.click(screen.getByRole('button', { name: /delete note/i }));

    expect(mockedDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });

  it('keeps the card when the delete request fails (6.5)', async () => {
    mockedList.mockResolvedValue([note('a', 'Alpha')]);
    mockedDelete.mockRejectedValue(new Error('500'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<NoteGrid categoryId={null} onOpen={() => {}} />);
    await screen.findByText('Alpha');

    await user.click(screen.getByRole('button', { name: /delete note/i }));

    await waitFor(() => expect(mockedDelete).toHaveBeenCalled());
    expect(screen.getByText('Alpha')).toBeInTheDocument(); // no silent loss
  });
});
