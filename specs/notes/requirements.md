# Requirements — Notes (create, edit, autosave)

## Introduction

The core of the app: a note the user can create instantly, write freely, and
edit later. Notes are auto-created (no "save" button), carry a live
last-edited timestamp, belong to a category, and take on that category's colour.
Source: the walkthrough transcript + video frames in `specs/raw_sources/`.

## Sources of truth

- **Behaviour/data:** this spec.
- **Appearance:** the Figma (exact colours/spacing/fonts). Values quoted here from
  the video frames are marked _(confirm in Figma)_.
- Conflicts → `Open questions`, never resolved silently.

## Requirements

### Requirement 1 — Create a note instantly

**User story:** As a user, I want a new note to be created the moment I ask for
one, so that I can start writing without a save step.

**Acceptance criteria**

1.1. WHEN the user clicks **+ New Note**, THE SYSTEM SHALL create and persist a
new note immediately and open it in the editor (HTTP 201), with no explicit
save action required.
1.2. WHEN a note is created, THE SYSTEM SHALL assign it a default category and
set `created_at` and `last_edited_at` to the creation time.
1.3. THE SYSTEM SHALL show placeholder text for an empty title and empty content
(frames: title "Note Title", body "Pour your heart out…") _(confirm in Figma)_.

### Requirement 2 — Edit title and content with autosave

**User story:** As a user, I want my edits saved automatically, so that I never
lose work.

**Acceptance criteria**

2.1. WHEN the user edits the title or content, THE SYSTEM SHALL persist the
change automatically (debounced), with no save button.
2.2. WHEN the note's title or content changes, THE SYSTEM SHALL update
`last_edited_at` to the time of the edit.
2.3. WHILE a save is in flight, THE SYSTEM SHALL not lose subsequent keystrokes
(edits are coalesced and the latest state wins).
2.4. THE SYSTEM SHALL display the last-edited time in the editor (frame:
"Last Edited: July 21, 2024 at 8:39pm") _(confirm exact format in Figma)_.

### Requirement 3 — Category drives the note's colour

**User story:** As a user, I want to categorise a note and see it reflected
visually, so that my notes feel organised.

**Acceptance criteria**

3.1. THE SYSTEM SHALL show the note's category in a dropdown in the editor
(top-left), listing all of the user's categories.
3.2. WHEN the user selects a different category, THE SYSTEM SHALL persist the new
category and update `last_edited_at`.
3.3. WHEN the category changes, THE SYSTEM SHALL change the editor's background to
that category's colour (peach = Random Thoughts, yellow = School, teal =
Personal) _(confirm exact hex in Figma)_.

### Requirement 4 — Close returns to the board

**User story:** As a user, I want to close a note and see all my notes.

**Acceptance criteria**

4.1. WHEN the user clicks the close (✕) control, THE SYSTEM SHALL return to the
board (see `specs/board/`) with the note's latest state persisted.

### Requirement 5 — Access control (notes & categories)

Applies the auth spec's access control (`specs/auth/` 4.1–4.2) to these
endpoints; numbered here so the notes tests trace to a criterion.

**Acceptance criteria**

5.1. THE SYSTEM SHALL require authentication for every note and category
endpoint; an unauthenticated request SHALL receive 401.
5.2. THE SYSTEM SHALL scope every note/category query to the authenticated user;
a user SHALL never read, edit, or delete another user's note (404).

## Related

Concurrent editing (locking), optimistic concurrency (`version`), and offline
editing/sync are specified in **`specs/collaboration/`** — an enhancement layer
on top of this core. This spec's create/edit is the online, single-editor path.

## Open questions

- [x] **Delete a note** is not shown in the walkthrough. **Decided: include it**
      (`DELETE /api/notes/{id}/` → 204, owner-scoped) for CRUD completeness and
      test coverage. UI entry point is deferred to the board spec; the endpoint +
      `NoteService.delete` ship here.
- [x] Autosave trigger. **Decided: debounced keystroke (~500 ms)**, no save
      button; edits coalesce and the latest state wins (2.3). Also flush on
      close/unmount so 4.1 persists the latest state.
- [x] Is there a character limit on content? **Decided: no limit** — the editor
      content is an unbounded `TextField`; the board card truncates the _preview_
      only (board 3.3).

## Additional endpoint (added per traceability — needed by 3.1)

Criterion 3.1 requires the editor to list the user's categories, but no
categories endpoint was specified. Added to `design.md`: `GET /api/categories/`
→ 200 `[{id, name, color, is_default}]`, owner-scoped. Owned by the notes
context (the `Category` entity lives here); the board sidebar (board spec) will
reuse it.

## Decision — default category on create (1.2)

The three seeded categories all carry `is_default=True` (they are the default
_set_). A new note is assigned the owner's **first** default category by id —
"Random Thoughts" for a freshly-seeded user — matching the walkthrough.
