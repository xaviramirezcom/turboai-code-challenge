import type { AuthResponse } from '@/entities/session';
import { api } from '@/shared/api';

export function login(email: string, password: string): Promise<AuthResponse> {
  return api.post<AuthResponse>(
    '/auth/login/',
    { email, password },
    { auth: false },
  );
}
