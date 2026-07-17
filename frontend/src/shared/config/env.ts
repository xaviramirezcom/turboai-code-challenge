/** Runtime configuration. Only NEXT_PUBLIC_* values reach the browser. */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

// Supabase Realtime (presence/broadcast, collaboration Phase C). When unset,
// the realtime layer no-ops — the app runs fine without it.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
