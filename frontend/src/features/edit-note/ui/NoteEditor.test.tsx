import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { listCategories } from '@/entities/category';
import { getNote, updateNote } from '@/entities/note';

import { NoteEditor } from './NoteEditor';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/entities/note', () => ({ getNote: vi.fn(), updateNote: vi.fn() }));
vi.mock('@/entities/category', () => ({ listCategories: vi.fn() }));

const mockedGet = vi.mocked(getNote);
const mockedUpdate = vi.mocked(updateNote);
const mockedList = vi.mocked(listCategories);

const NOTE = {
  id: 'n1',
  title: '',
  content: '',
  category_id: 1,
  category: { id: 1, name: 'Random Thoughts', color: '#EF9C66' },
  created_at: '2024-07-21T20:39:00',
  last_edited_at: '2024-07-21T20:39:00',
};

const CATS = [
  {
    id: 1,
    name: 'Random Thoughts',
    color: '#EF9C66',
    is_default: true,
    note_count: 0,
  },
  { id: 2, name: 'School', color: '#FCDC94', is_default: true, note_count: 0 },
  {
    id: 3,
    name: 'Personal',
    color: '#78ABA8',
    is_default: true,
    note_count: 0,
  },
];

function setup() {
  mockedGet.mockResolvedValue(NOTE);
  mockedList.mockResolvedValue(CATS);
}

afterEach(() => vi.clearAllMocks());

describe('NoteEditor', () => {
  it('shows the placeholders and last-edited label once loaded', async () => {
    // covers 1.3, 2.4, 3.1
    setup();
    render(<NoteEditor noteId="n1" />);

    expect(
      await screen.findByPlaceholderText('Note Title'),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Pour your heart out…'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Last Edited: July 21, 2024 at 8:39pm'),
    ).toBeInTheDocument();
    // 3.1 — the category dropdown lists the user's categories
    await userEvent.click(
      screen.getByRole('button', { name: /Random Thoughts/ }),
    );
    expect(screen.getByRole('option', { name: 'School' })).toBeInTheDocument();
  });

  it('autosaves edits after a debounce, coalescing to the latest text', async () => {
    // covers 2.1, 2.3
    setup();
    mockedUpdate.mockResolvedValue({ ...NOTE, content: 'hello there' });
    const user = userEvent.setup();
    render(<NoteEditor noteId="n1" />);

    const body = await screen.findByLabelText('Note content');
    await user.type(body, 'hello there');

    await waitFor(
      () =>
        expect(mockedUpdate).toHaveBeenCalledWith(
          'n1',
          expect.objectContaining({ content: 'hello there' }),
        ),
      { timeout: 2000 },
    );
  });

  it('coalesces a keystroke that lands while a save is in flight', async () => {
    // covers 2.3 — no concurrent PATCH; the latest text wins
    setup();
    let resolveFirst: (() => void) | undefined;
    mockedUpdate
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = () => resolve({ ...NOTE, content: 'one' });
          }),
      )
      .mockResolvedValue({ ...NOTE, content: 'one two' });
    const user = userEvent.setup();
    render(<NoteEditor noteId="n1" />);

    const body = await screen.findByLabelText('Note content');
    await user.type(body, 'one');
    // First PATCH fires after the debounce and is left in flight.
    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledTimes(1), {
      timeout: 2000,
    });

    // Type more while the first save is still pending.
    await user.type(body, ' two');
    expect(mockedUpdate).toHaveBeenCalledTimes(1); // no second concurrent PATCH

    resolveFirst?.();

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledTimes(2), {
      timeout: 2000,
    });
    expect(mockedUpdate.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({ content: 'one two' }),
    );
  });

  it('changes category, persisting and recolouring the editor', async () => {
    // covers 3.2, 3.3
    setup();
    mockedUpdate.mockResolvedValue({
      ...NOTE,
      category_id: 2,
      category: { id: 2, name: 'School', color: '#FCDC94' },
    });
    const user = userEvent.setup();
    const { container } = render(<NoteEditor noteId="n1" />);

    await screen.findByPlaceholderText('Note Title');
    await user.click(screen.getByRole('button', { name: /Random Thoughts/ }));
    await user.click(screen.getByRole('button', { name: 'School' }));

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith('n1', { category_id: 2 }),
    );
    await waitFor(() => {
      const card = container.querySelector('.editor-card') as HTMLElement;
      expect(card).toHaveStyle({ backgroundColor: 'rgba(252, 220, 148, 0.5)' });
    });
  });

  it('flushes and returns to the board on close', async () => {
    // covers 4.1
    setup();
    const user = userEvent.setup();
    render(<NoteEditor noteId="n1" />);

    await screen.findByPlaceholderText('Note Title');
    await user.click(screen.getByRole('button', { name: 'Close note' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/board'));
  });

  it('shows an error state when the note cannot be loaded', async () => {
    mockedGet.mockRejectedValue(new Error('404'));
    mockedList.mockResolvedValue(CATS);
    render(<NoteEditor noteId="missing" />);

    expect(
      await screen.findByText('That note could not be found.'),
    ).toBeInTheDocument();
  });
});
