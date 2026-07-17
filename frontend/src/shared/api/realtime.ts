/** Realtime presence layer (collaboration Phase C), behind a small port so the
 * app can run without Supabase and tests can inject a fake channel.
 *
 * Payloads carry only session ids — never note content or secrets. Django is
 * the real authority; Realtime is UX only.
 */

import { createClient } from '@supabase/supabase-js';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/shared/config';

export interface PresenceHandle {
  leave: () => Promise<void>;
}

export interface RealtimeClient {
  readonly enabled: boolean;
  /** Join a note's presence channel. `onPresence` receives the present session
   * ids whenever presence changes. */
  joinNote: (
    noteId: string,
    sessionId: string,
    onPresence: (sessions: string[]) => void,
  ) => PresenceHandle;
}

const noopClient: RealtimeClient = {
  enabled: false,
  joinNote: () => ({ leave: async () => {} }),
};

/** Exported for tests: builds the real Supabase-backed client. Prefer
 * `getRealtimeClient()` in app code. */
export function createSupabaseRealtime(
  url: string,
  key: string,
): RealtimeClient {
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  return {
    enabled: true,
    joinNote(noteId, sessionId, onPresence) {
      const channel = supabase.channel(`note:${noteId}`, {
        config: { presence: { key: sessionId } },
      });
      channel
        .on('presence', { event: 'sync' }, () => {
          onPresence(Object.keys(channel.presenceState()));
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') void channel.track({ at: 'note' });
        });
      return {
        leave: async () => {
          await channel.unsubscribe();
        },
      };
    },
  };
}

let cached: RealtimeClient | null = null;

export function getRealtimeClient(): RealtimeClient {
  if (cached) return cached;
  cached =
    SUPABASE_URL && SUPABASE_ANON_KEY
      ? createSupabaseRealtime(SUPABASE_URL, SUPABASE_ANON_KEY)
      : noopClient;
  return cached;
}

/** Test hook: inject a fake realtime client. */
export function _setRealtimeClient(client: RealtimeClient | null): void {
  cached = client;
}
