# Requirements — Board (sidebar, filtering, preview cards)

## Introduction

The home screen after login: a sidebar of categories with note counts, and a
grid of note preview cards. Users filter by category and open a note to edit it.
Includes the empty state. Source: transcript + video frames in
`specs/raw_sources/`.

## Sources of truth
- **Behaviour/data:** this spec. **Appearance:** the Figma *(frame values here
  confirm in Figma)*. Conflicts → Open questions.

## Requirements

### Requirement 1 — Category sidebar with counts

**User story:** As a user, I want to see my categories and how many notes each
holds, so that I can navigate my notes.

**Acceptance criteria**

1.1. THE SYSTEM SHALL show, in the left sidebar, an **All Categories** entry plus
     each of the user's categories, each with its colour dot and name.
1.2. THE SYSTEM SHALL show, next to each category, the count of that user's notes
     in that category (frame: Random Thoughts 3, School 3, Personal 1).
1.3. THE SYSTEM SHALL seed every new user with three default categories — Random
     Thoughts, School, Personal (see `specs/auth/`).

### Requirement 2 — Filter by category

**Acceptance criteria**

2.1. WHEN the user selects a category, THE SYSTEM SHALL display only that
     category's notes.
2.2. WHEN the user selects **All Categories**, THE SYSTEM SHALL display all of the
     user's notes.
2.3. THE SYSTEM SHALL indicate which filter is active.

### Requirement 3 — Preview cards

**User story:** As a user, I want a readable preview of each note.

**Acceptance criteria**

3.1. THE SYSTEM SHALL render each note as a card showing: the last-edited date,
     the category name, the title, and a content preview.
3.2. THE SYSTEM SHALL give each card the background colour of its category.
3.3. IF the content overflows the card, THEN THE SYSTEM SHALL truncate it with an
     ellipsis (frame: long note ends "…").
3.4. WHEN the user clicks a card, THE SYSTEM SHALL open that note in the editor
     (see `specs/notes/`).
3.5. THE SYSTEM SHALL order cards by most recently edited first.

### Requirement 4 — Relative date formatting

**User story:** As a user, I want friendly dates.

**Acceptance criteria**

4.1. IF a note was last edited today, THEN THE SYSTEM SHALL display "today".
4.2. IF a note was last edited yesterday, THEN THE SYSTEM SHALL display
     "yesterday".
4.3. IF a note was last edited before yesterday, THEN THE SYSTEM SHALL display
     the month and day only (e.g. "July 16"), with **no year**.

### Requirement 5 — Empty state

**Acceptance criteria**

5.1. IF the user has no notes in the current filter, THEN THE SYSTEM SHALL show
     the empty state (illustration + "I'm just here waiting for your charming
     notes…") *(confirm copy/art in Figma)* while still showing the sidebar and
     **+ New Note**.

### Requirement 6 — Delete a note from its card

**User story:** As a user, I want to delete a note straight from the board
without opening it, so I can clear out notes quickly.

Not in the Figma — style the ✕ to match the app (like the editor's close ✕) and
keep it minimal (see `design.md`).

**Acceptance criteria**

6.1. WHEN the user hovers (or keyboard-focuses) a note card, THE SYSTEM SHALL
     reveal a delete (✕) control on that card.
6.2. WHEN the user activates the delete control, THE SYSTEM SHALL ask for a
     lightweight confirmation before deleting.
6.3. WHEN the user confirms, THE SYSTEM SHALL delete the note
     (`DELETE /api/notes/{id}/` → 204), remove its card from the grid, and
     decrement the affected category counts (the note's category and All
     Categories) — WITHOUT opening the note (the delete click SHALL NOT navigate
     to the editor).
6.4. IF the user cancels the confirmation, THEN THE SYSTEM SHALL not delete the
     note and SHALL NOT navigate to the editor.
6.5. IF the delete request fails, THEN THE SYSTEM SHALL keep the note's card
     (no silent loss) — the card is removed only after a successful 204.

## Open questions
- [x] Does the count next to a category respect the active filter, or always show
      totals? **Decided: totals** (frames show totals) — `GET /api/categories/`
      returns each category's total `note_count`, independent of the active filter.
- [x] Card content preview: character/line limit before truncation. **Decided: no
      hard char cap — CSS line-clamp with an ellipsis** (the card's fixed content
      area clamps overflowing lines, matching the Figma card).
- [x] Timezone for "today/yesterday": user-local vs server? **Decided: user-local**
      — dates format client-side from the ISO `last_edited_at` (API stays neutral).
