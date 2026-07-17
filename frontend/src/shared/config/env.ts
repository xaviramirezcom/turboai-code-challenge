/** Runtime configuration. Only NEXT_PUBLIC_* values reach the browser. */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
