export interface Category {
  id: number;
  name: string;
  color: string;
  is_default: boolean;
  /** Total notes in this category (board sidebar count, criterion 1.2). */
  note_count: number;
}
