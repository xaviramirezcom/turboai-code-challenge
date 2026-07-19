import { afterEach, describe, expect, it, vi } from 'vitest';

import { checkHealth, getOnline, setOnline } from './connectivity';

afterEach(() => {
  setOnline(true);
  vi.restoreAllMocks();
});

describe('connectivity store', () => {
  it('reflects online/offline transitions', () => {
    // covers 1.1
    setOnline(false);
    expect(getOnline()).toBe(false);
    setOnline(true);
    expect(getOnline()).toBe(true);
  });

  it('checkHealth returns true on a 2xx health response', async () => {
    // covers 1.1 (heartbeat)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200 }),
    );
    expect(await checkHealth()).toBe(true);
  });

  it('checkHealth sends ngrok-skip-browser-warning', async () => {
    // The heartbeat bypasses shared/api and fetches directly, so it needs the
    // header too — otherwise a tunnelled backend answers with the interstitial
    // and the app reads as offline while the API is fine.
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    await checkHealth();

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init.headers['ngrok-skip-browser-warning']).toBe('true');
  });

  it('checkHealth returns false when the request fails (offline)', async () => {
    // covers 1.1
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    expect(await checkHealth()).toBe(false);
  });
});
