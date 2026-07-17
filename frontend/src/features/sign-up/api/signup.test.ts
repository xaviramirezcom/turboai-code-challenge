import { afterEach, describe, expect, it, vi } from 'vitest';

import { signup } from './signup';

afterEach(() => vi.restoreAllMocks());

describe('signup api', () => {
  it('POSTs credentials to /auth/signup/', async () => {
    // covers 1.2
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () =>
        Promise.resolve({
          token: 't',
          user: { id: 2, email: 'new@friend.com' },
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await signup('new@friend.com', 'pw');

    expect(result.user.email).toBe('new@friend.com');
    expect(fetchMock).toHaveBeenCalledOnce();
    const url = fetchMock.mock.calls[0]?.[0];
    const init = fetchMock.mock.calls[0]?.[1];
    expect(String(url)).toContain('/auth/signup/');
    expect(init.method).toBe('POST');
  });
});
