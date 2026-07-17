/** A client-generated UUID (for a note's stable id before it's persisted —
 * deferred creation, notes 1.2). The backend id is a UUIDField, so the fallback
 * (non-secure contexts where crypto.randomUUID is absent) must still be a valid
 * v4 UUID or the create is rejected. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
