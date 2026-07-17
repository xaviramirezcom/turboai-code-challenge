import { afterEach, describe, expect, it, vi } from 'vitest';

import { login } from './login';

afterEach(() => vi.restoreAllMocks());

describe('login api', () => {
  it('POSTs credentials to /auth/login/', async () => {
    // covers 2.2
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ token: 't', user: { id: 1, email: 'a@b.com' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await login('a@b.com', 'pw');

    expect(result.token).toBe('t');
    expect(fetchMock).toHaveBeenCalledOnce();
    const url = fetchMock.mock.calls[0]?.[0];
    const init = fetchMock.mock.calls[0]?.[1];
    expect(String(url)).toContain('/auth/login/');
    expect(init.method).toBe('POST');
  });
});
