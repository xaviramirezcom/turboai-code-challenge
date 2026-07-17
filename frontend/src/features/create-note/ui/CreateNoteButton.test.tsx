import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createNote } from '@/entities/note';

import { CreateNoteButton } from './CreateNoteButton';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/entities/note', () => ({ createNote: vi.fn() }));
vi.mock('@/shared/lib', () => ({ newId: () => 'draft-123' }));

const mockedCreate = vi.mocked(createNote);

afterEach(() => vi.clearAllMocks());

describe('CreateNoteButton', () => {
  it('opens an empty draft editor without persisting a note (notes 1.1)', async () => {
    // covers 1.1 — deferred creation: no POST on click, just open the draft
    const user = userEvent.setup();
    render(<CreateNoteButton />);

    await user.click(screen.getByRole('button', { name: 'New Note' }));

    expect(mockedCreate).not.toHaveBeenCalled(); // no note persisted yet
    expect(push).toHaveBeenCalledWith('/notes/draft-123?new=1');
  });
});
