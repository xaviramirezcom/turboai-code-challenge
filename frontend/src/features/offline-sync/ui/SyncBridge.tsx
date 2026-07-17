'use client';

import { useEffect } from 'react';

import { startConnectivityMonitor, useOnline } from '@/shared/lib';

import { flush } from '../model/outbox';

/** Renders nothing: starts the connectivity monitor and flushes the outbox
 * whenever connectivity returns (3.1). Mount once, app-wide. */
export function SyncBridge() {
  const online = useOnline();

  useEffect(() => startConnectivityMonitor(), []);

  useEffect(() => {
    if (online) void flush();
  }, [online]);

  return null;
}
