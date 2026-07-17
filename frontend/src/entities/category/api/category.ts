import { api } from '@/shared/api';

import type { Category } from '../model/types';

export function listCategories(): Promise<Category[]> {
  return api.get<Category[]>('/categories/');
}
