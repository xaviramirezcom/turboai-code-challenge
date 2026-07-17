# EARS acceptance criteria — cheatsheet

EARS (Easy Approach to Requirements Syntax) keeps acceptance criteria precise
and testable. Each criterion maps almost one-to-one to a test, which is exactly
what we want for spec-driven development.

## The five patterns

1. **Ubiquitous** — always true.
   > THE SYSTEM SHALL persist each note with a created and updated timestamp.

2. **Event-driven** — `WHEN <trigger>`.
   > WHEN the user submits a note with a non-empty title, THE SYSTEM SHALL
   > create the note and return it with a generated id.

3. **State-driven** — `WHILE <in a state>`.
   > WHILE a save request is in flight, THE SYSTEM SHALL disable the save button.

4. **Conditional / unwanted behavior** — `IF <condition> THEN`.
   > IF the title is empty, THEN THE SYSTEM SHALL reject the request with a 400
   > and a field-level error, and SHALL NOT create a note.

5. **Optional feature** — `WHERE <feature is included>`.
   > WHERE search is enabled, WHEN the user types a query, THE SYSTEM SHALL show
   > only notes whose title or body contains the query.

## Rules for good criteria

- **One behavior per criterion.** If you need "and" for two behaviors, split it.
- **Observable.** State it as something a test can assert (a status code, a
  visible element, a stored value) — not an implementation detail.
- **Number them** within each requirement: `1.1`, `1.2`, … These IDs are the
  traceability keys used in `design.md`, `tasks.md`, and test comments.
- **Include the unhappy path.** Validation failures, empty inputs, and error
  responses are criteria too — and they're where graders look.
- **SHALL = required. SHALL NOT = forbidden.** Avoid "should"/"may" for
  must-have behavior.

## Behavior vs. design

EARS criteria describe **behavior** (the spec's job). They should not pin pixels
— "the button is 8px from the edge" belongs to the Figma. Where a criterion has
a visual, the `design.md` links the Figma frame that defines its appearance.
