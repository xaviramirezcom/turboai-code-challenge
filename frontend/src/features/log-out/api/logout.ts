import { api } from '@/shared/api';

export function logout(): Promise<null> {
  return api.post<null>('/auth/logout/');
}
