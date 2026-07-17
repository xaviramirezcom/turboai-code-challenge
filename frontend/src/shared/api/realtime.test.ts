import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  _setRealtimeClient,
  createSupabaseRealtime,
  getRealtimeClient,
} from './realtime';

const track = vi.fn();
const presenceState = vi.fn(() => ({ 'session-a': [{ at: 'note' }] }));
const channel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn((cb: (status: string) => void) => {
    cb('SUBSCRIBED');
    return channel;
  }),
  track,
  presenceState,
  unsubscribe: vi.fn(async () => {}),
};
const channelFactory = vi.fn(() => channel);
const createClient = vi.fn((..._args: unknown[]) => ({
  channel: channelFactory,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}));

afterEach(() => {
  _setRealtimeClient(null);
  vi.clearAllMocks();
});

describe('realtime client', () => {
  it('no-ops when Supabase env is unset', () => {
    // covers graceful degrade — the app runs without Supabase Realtime
    const client = getRealtimeClient(); // NEXT_PUBLIC_SUPABASE_* unset in tests
    expect(client.enabled).toBe(false);

    const onPresence = vi.fn();
    const handle = client.joinNote('n1', 'session-a', onPresence);
    expect(handle.leave).toBeTypeOf('function');
    expect(onPresence).not.toHaveBeenCalled(); // no channel, no callbacks
  });
});

describe('createSupabaseRealtime', () => {
  it('keys presence by session id and broadcasts only "at: note" — no content/secrets (10)', () => {
    // covers requirement 10 — nothing but session ids flows over the channel
    const client = createSupabaseRealtime('https://x.supabase.co', 'anon-key');
    expect(client.enabled).toBe(true);

    client.joinNote('n1', 'session-a', vi.fn());

    // channel scoped to the note; presence keyed by the session id, not the user
    expect(channelFactory).toHaveBeenCalledWith('note:n1', {
      config: { presence: { key: 'session-a' } },
    });
    // the only payload put on the wire is a benign marker — no title/content
    expect(track).toHaveBeenCalledWith({ at: 'note' });
    const payload = track.mock.calls[0]?.[0] ?? {};
    expect(Object.keys(payload)).toEqual(['at']);
  });

  it('reports present sessions as ids from presence state', () => {
    // covers 4.1 against the real wrapper
    const onPresence = vi.fn();
    createSupabaseRealtime('https://x.supabase.co', 'anon-key').joinNote(
      'n1',
      'session-a',
      onPresence,
    );

    // find the 'presence'/'sync' handler the wrapper registered and fire it
    const syncCall = channel.on.mock.calls.find(
      ([event, opts]) => event === 'presence' && opts?.event === 'sync',
    );
    const syncHandler = syncCall?.[2] as () => void;
    syncHandler();

    expect(onPresence).toHaveBeenCalledWith(['session-a']);
  });
});
