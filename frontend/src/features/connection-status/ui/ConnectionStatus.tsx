'use client';

import { useEffect, useState } from 'react';

import { useSyncState } from '@/features/offline-sync';
import { useOnline } from '@/shared/lib';

/** Persistent offline indicator (1.2) + transient back-online/syncing/synced
 * feedback (1.3). Fixed to the top of the viewport. */
export function ConnectionStatus() {
  const online = useOnline();
  const { status } = useSyncState();
  const [showSynced, setShowSynced] = useState(false);

  useEffect(() => {
    if (status === 'synced') {
      setShowSynced(true);
      const timer = setTimeout(() => setShowSynced(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (!online) {
    return (
      <div className="conn conn--offline" role="status">
        Offline — changes saved locally
      </div>
    );
  }
  if (status === 'syncing') {
    return (
      <div className="conn conn--syncing" role="status">
        Back online — syncing…
      </div>
    );
  }
  if (showSynced) {
    return (
      <div className="conn conn--synced" role="status">
        Synced
      </div>
    );
  }
  return null;
}
