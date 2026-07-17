export interface OpFields {
  title?: string;
  content?: string;
  category_id?: number;
}

/** A queued offline mutation (2.3): note id + base_version + when it was made. */
export interface Op {
  opId: string;
  kind: 'create' | 'patch';
  noteId: string;
  baseVersion: number;
  editedAt: string; // ISO — drives last-write-wins reconciliation (3.2)
  fields: OpFields;
}

/** A local edit that lost a last-write-wins reconciliation, preserved (3.2). */
export interface Conflict {
  noteId: string;
  losing: OpFields;
  editedAt: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced';
