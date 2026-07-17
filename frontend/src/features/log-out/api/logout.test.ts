import { afterEach, describe, expect, it, vi } from 'vitest';

import { logout } from './logout';

afterEach(() => vi.restoreAllMocks());

describe('logout api', () => {
  it('POSTs to /auth/logout/', async () => {
    // covers logout (resolved open question)
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal('fetch', fetchMock);

    await logout();

    expect(fetchMock).toHaveBeenCalledOnce();
    const url = fetchMock.mock.calls[0]?.[0];
    const init = fetchMock.mock.calls[0]?.[1];
    expect(String(url)).toContain('/auth/logout/');
    expect(init.method).toBe('POST');
  });
});
