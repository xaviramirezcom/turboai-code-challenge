'use client';

import { useEffect, useState } from 'react';

import { type Category, listCategories } from '@/entities/category';

export interface CategoriesState {
  categories: Category[];
  loading: boolean;
  error: boolean;
}

export function useCategories(): CategoriesState {
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
  }, []);

  return { categories, loading, error };
}
