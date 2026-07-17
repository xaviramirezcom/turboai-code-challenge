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

  it('checkHealth returns false when the request fails (offline)', async () => {
    // covers 1.1
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    expect(await checkHealth()).toBe(false);
  });
});
