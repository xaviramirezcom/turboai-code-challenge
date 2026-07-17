import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { listCategories } from '@/entities/category';

import { CategorySidebar } from './CategorySidebar';

vi.mock('@/entities/category', () => ({ listCategories: vi.fn() }));
const mockedList = vi.mocked(listCategories);

const CATS = [
  {
    id: 1,
    name: 'Random Thoughts',
    color: '#EF9C66',
    is_default: true,
    note_count: 3,
  },
  { id: 2, name: 'School', color: '#FCDC94', is_default: true, note_count: 1 },
  {
    id: 3,
    name: 'Personal',
    color: '#78ABA8',
    is_default: true,
    note_count: 0,
  },
];

afterEach(() => vi.clearAllMocks());

describe('CategorySidebar', () => {
  it('renders All Categories plus each category with its count', async () => {
    // covers 1.1, 1.2
    mockedList.mockResolvedValue(CATS);
    render(<CategorySidebar activeId={null} onSelect={() => {}} />);

    expect(
      screen.getByRole('button', { name: 'All Categories' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: /Random Thoughts 3/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /School 1/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Personal 0/ }),
    ).toBeInTheDocument();
  });

  it('selecting a category invokes onSelect with its id', async () => {
    // covers 2.1
    mockedList.mockResolvedValue(CATS);
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<CategorySidebar activeId={null} onSelect={onSelect} />);

    await user.click(await screen.findByRole('button', { name: /School 1/ }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('selecting All Categories invokes onSelect with null', async () => {
    // covers 2.2
    mockedList.mockResolvedValue(CATS);
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<CategorySidebar activeId={2} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: 'All Categories' }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('marks the active filter with aria-current', async () => {
    // covers 2.3
    mockedList.mockResolvedValue(CATS);
    render(<CategorySidebar activeId={2} onSelect={() => {}} />);

    const school = await screen.findByRole('button', { name: /School 1/ });
    expect(school).toHaveAttribute('aria-current', 'true');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'All Categories' }),
      ).toHaveAttribute('aria-current', 'false'),
    );
  });

  it('shows an error affordance when categories fail to load', async () => {
    // covers 1.1 error state
    mockedList.mockRejectedValue(new Error('500'));
    render(<CategorySidebar activeId={null} onSelect={() => {}} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Couldn’t load categories.',
    );
    expect(
      screen.getByRole('button', { name: 'All Categories' }),
    ).toBeInTheDocument();
  });
});
