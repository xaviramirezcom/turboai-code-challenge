'use client';

import { useEffect, useState } from 'react';

import { type Category, listCategories } from '@/entities/category';

export interface CategoriesState {
  categories: Category[];
  loading: boolean;
  error: boolean;
}

/** `refreshKey` re-fetches when it changes, so the view can refresh the note
 * counts after a delete (board 6.3). */
export function useCategories(refreshKey = 0): CategoriesState {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    listCategories()
      .then((cats) => {
        if (active) {
          setCategories(cats);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  return { categories, loading, error };
}
