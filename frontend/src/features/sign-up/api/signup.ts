import type { AuthResponse } from '@/entities/session';
import { api } from '@/shared/api';

export function signup(email: string, password: string): Promise<AuthResponse> {
  return api.post<AuthResponse>(
    '/auth/signup/',
    { email, password },
    { auth: false },
  );
}
