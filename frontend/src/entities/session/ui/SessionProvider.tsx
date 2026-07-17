'use client';

import { type ReactNode, useEffect } from 'react';

import { rehydrate } from '../model/store';

/** Restores a persisted session once on client mount (auth reload persistence). */
export function SessionProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    rehydrate();
  }, []);
  return <>{children}</>;
}
