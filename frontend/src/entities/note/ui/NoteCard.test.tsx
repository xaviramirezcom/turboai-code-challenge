import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Note } from '../model/types';
import { NoteCard } from './NoteCard';

const NOTE: Note = {
  id: 'n1',
  title: 'Grocery List',
  content: 'Milk, Eggs',
  category_id: 1,
  category: { id: 1, name: 'Random Thoughts', color: '#EF9C66' },
  created_at: '2024-07-21T20:39:00',
  last_edited_at: '2024-07-21T20:39:00',
  version: 1,
  locked_by: null,
  lock_expires_at: null,
};

describe('NoteCard', () => {
  it('renders the date, category, title and preview with the category colour', () => {
    // covers board 3.1/3.2 (card data + colour); used by notes NoteCard task
    render(<NoteCard note={NOTE} />);

    expect(screen.getByText('July 21')).toBeInTheDocument();
    expect(screen.getByText('Random Thoughts')).toBeInTheDocument();
    expect(screen.getByText('Grocery List')).toBeInTheDocument();
    expect(screen.getByText('Milk, Eggs')).toBeInTheDocument();

    const card = screen.getByRole('button');
    expect(card).toHaveStyle({ backgroundColor: 'rgba(239, 156, 102, 0.5)' });
    // 3.3 — overflow content is truncated by the clamped preview element
    expect(screen.getByText('Milk, Eggs')).toHaveClass('note-card__preview');
  });

  it('calls onOpen when clicked', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(<NoteCard note={NOTE} onOpen={onOpen} />);

    await user.click(screen.getByRole('button', { name: /Grocery List/ }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('shows a delete control only when onDelete is provided (board 6.1)', () => {
    const { rerender } = render(<NoteCard note={NOTE} />);
    expect(
      screen.queryByRole('button', { name: /delete note/i }),
    ).not.toBeInTheDocument();

    rerender(<NoteCard note={NOTE} onDelete={() => {}} />);
    expect(
      screen.getByRole('button', { name: /delete note/i }),
    ).toBeInTheDocument();
  });

  it('the delete control fires onDelete and does NOT open the note (board 6.3)', async () => {
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<NoteCard note={NOTE} onOpen={onOpen} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /delete note/i }));
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onOpen).not.toHaveBeenCalled(); // stopPropagation — no navigation
  });
});
