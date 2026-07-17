import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createNote } from '@/entities/note';

import { CreateNoteButton } from './CreateNoteButton';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/entities/note', () => ({ createNote: vi.fn() }));

const mockedCreate = vi.mocked(createNote);

afterEach(() => vi.clearAllMocks());

describe('CreateNoteButton', () => {
  it('creates a note and opens it in the editor', async () => {
    // covers 1.1
    const user = userEvent.setup();
    mockedCreate.mockResolvedValue({
      id: 'new-id',
      title: '',
      content: '',
      category_id: 1,
      category: { id: 1, name: 'Random Thoughts', color: '#EF9C66' },
      created_at: '2024-07-21T20:39:00',
      last_edited_at: '2024-07-21T20:39:00',
      version: 1,
      locked_by: null,
      lock_expires_at: null,
    });

    render(<CreateNoteButton />);
    await user.click(screen.getByRole('button', { name: 'New Note' }));

    expect(mockedCreate).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith('/notes/new-id');
  });
});
