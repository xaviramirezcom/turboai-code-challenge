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
}

export interface NotePatch {
  title?: string;
  content?: string;
  category_id?: number;
}
