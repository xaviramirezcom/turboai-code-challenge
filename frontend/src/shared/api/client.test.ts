import { afterEach, describe, expect, it, vi } from 'vitest';

import { setAuthToken } from './authToken';
import { api, ApiError } from './client';

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

afterEach(() => {
  setAuthToken(null);
  vi.restoreAllMocks();
});

describe('shared/api client', () => {
  it('attaches the Authorization header when a token is set', async () => {
    const fetchMock = mockFetch(200, { ok: true });
    vi.stubGlobal('fetch', fetchMock);
    setAuthToken('secret-token');

    await api.get('/notes/');

    expect(fetchMock).toHaveBeenCalledOnce();
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init.headers.Authorization).toBe('Token secret-token');
  });

  it('omits Authorization when auth is disabled', async () => {
    const fetchMock = mockFetch(200, {});
    vi.stubGlobal('fetch', fetchMock);
    setAuthToken('secret-token');

    await api.post('/auth/login/', { email: 'a@b.com' }, { auth: false });

    expect(fetchMock).toHaveBeenCalledOnce();
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('throws ApiError with status and body on a non-2xx response', async () => {
    vi.stubGlobal('fetch', mockFetch(400, { email: ['taken'] }));

    await expect(api.post('/auth/signup/', {})).rejects.toMatchObject({
      status: 400,
      data: { email: ['taken'] },
    });
    await expect(api.post('/auth/signup/', {})).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});
