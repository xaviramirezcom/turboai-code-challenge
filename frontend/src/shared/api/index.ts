export { api, ApiError } from './client';
export { setAuthToken, getAuthToken } from './authToken';
// Note: getRealtimeClient is intentionally NOT re-exported here — importing it
// pulls in @supabase/supabase-js. Import it directly from '@/shared/api/realtime'
// (only the editor's presence feature does) so other pages stay lean.
