# Requirements — <feature name>

<!--
HOW TO USE: Copy this folder to specs/<feature-name>/ and fill each section.
Delete these HTML comments as you go. Keep criteria in EARS form (see
../EARS-cheatsheet.md). Number every criterion — the IDs are how tests trace
back here.
-->

## Introduction

<!-- 2–4 sentences: what this feature is, who it's for, and the outcome. -->

## Sources of truth

- **Behavior/data:** this spec.
- **Visual design:** Figma — <link to the file>. Relevant frames are linked per
  requirement below and in `design.md`.
- **Conflicts:** anything where the Figma and this spec disagree goes under
  "Open questions" — do not resolve silently.

## Requirements

### Requirement 1 — <short title>

**User story:** As a <role>, I want <capability>, so that <benefit>.

**Acceptance criteria**

1.1. WHEN <trigger>, THE SYSTEM SHALL <observable response>.
1.2. IF <condition>, THEN THE SYSTEM SHALL <response> and SHALL NOT <forbidden>.
1.3. THE SYSTEM SHALL <always-true rule>.

<!-- Figma frame(s) for this requirement's UI, if any: <frame link> -->

### Requirement 2 — <short title>

**User story:** As a <role>, I want <capability>, so that <benefit>.

**Acceptance criteria**

2.1. WHEN <trigger>, THE SYSTEM SHALL <response>.
2.2. WHILE <state>, THE SYSTEM SHALL <response>.

<!-- add as many requirements as the feature needs -->

---

## Worked example (delete once you've written your own)

### Requirement 1 — Create a note

**User story:** As a user, I want to create a note with a title and body, so
that I can capture a thought.

**Acceptance criteria**

1.1. WHEN the user submits a note with a non-empty title, THE SYSTEM SHALL
     create the note and return it with a generated id and timestamps (HTTP 201).
1.2. IF the title is empty or missing, THEN THE SYSTEM SHALL respond 400 with a
     `title` field error and SHALL NOT create a note.
1.3. WHEN a note is created, THE SYSTEM SHALL set `created_at` and `updated_at`
     to the creation time.

*Figma:* Create-note frame → <link>. (Design owns the form's look; this spec
owns the validation behavior.)

## Open questions

<!-- List ambiguities and spec/Figma conflicts here. Resolve before coding, or
     flag them to the human. Example: -->
- [ ] Does the body have a max length? Figma shows a counter; spec is silent.
