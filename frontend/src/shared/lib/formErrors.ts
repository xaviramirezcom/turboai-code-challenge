/** Flatten a DRF error body ({field: [msg], detail: msg}) to {field: msg}. */

export type FieldErrors = Record<string, string>;

export function fieldErrorsFrom(data: unknown): FieldErrors {
  const out: FieldErrors = {};
  if (data && typeof data === 'object') {
    for (const [key, value] of Object.entries(
      data as Record<string, unknown>,
    )) {
      if (Array.isArray(value) && value.length > 0) {
        out[key] = String(value[0]);
      } else if (typeof value === 'string') {
        out[key] = value;
      }
    }
  }
  return out;
}
