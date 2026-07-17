/** In-memory auth-token holder.

The token lives in memory (not localStorage) per the auth design; the HTTP
client reads it to attach the Authorization header. The `entities/session`
slice is the only writer, via `setAuthToken`, keeping auth handling in one place.
*/

let token: string | null = null;

export function setAuthToken(next: string | null): void {
  token = next;
}

export function getAuthToken(): string | null {
  return token;
}
