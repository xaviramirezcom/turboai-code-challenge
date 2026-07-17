import { afterEach, describe, expect, it, vi } from 'vitest';

import { listCategories } from './category';

afterEach(() => vi.restoreAllMocks());

describe('category api', () => {
  it('GETs /categories/ and returns typed categories', async () => {
    const rows = [
      { id: 1, name: 'School', color: '#FCDC94', is_default: true },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(rows),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await listCategories();

    expect(result[0]?.name).toBe('School');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/categories/');
  });
});
