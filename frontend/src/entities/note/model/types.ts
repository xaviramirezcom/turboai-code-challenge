export interface NoteCategory {
  id: number;
  name: string;
  color: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category_id: number;
  category: NoteCategory;
  created_at: string;
  last_edited_at: string;
  // Collaboration: optimistic version + advisory-lock state (session + expiry).
  version: number;
  locked_by: string | null;
  lock_expires_at: string | null;
}

export interface NotePatch {
  title?: string;
  content?: string;
  category_id?: number;
  base_version?: number; // optimistic concurrency (6.2)
}

/** 200 lock state or a 423 body. */
export interface LockState {
  locked_by: string | null;
  lock_expires_at: string | null;
}
