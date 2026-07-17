# Requirements — Auth (signup, login)

## Introduction

Entry to the app: a user signs up or logs in, then lands on their board. Each
user has their own notes and categories. On signup, the three default categories
are seeded. Source: transcript + video frames ("Yay, New Friend!" / "Yay, You're
Back!").

> Scope note: auth adds real backend surface (user model, auth tokens/sessions,
> per-user data). It is part of the demonstrated design, but if time is tight it
> is the most reasonable feature to reduce to a minimal implementation. Flagged
> for a prioritisation decision, not silently dropped.

## Sources of truth

- **Behaviour/data:** this spec. **Appearance:** the Figma _(frame values confirm
  in Figma)_. Conflicts → Open questions.

## Requirements

### Requirement 1 — Sign up

**User story:** As a new user, I want to create an account with email and
password, so that my notes are mine.

**Acceptance criteria**

1.1. THE SYSTEM SHALL present a signup screen ("Yay, New Friend!") with email and
password fields and a **Sign Up** action.
1.2. WHEN the user submits a valid, unused email and a password meeting policy,
THE SYSTEM SHALL create the account and start an authenticated session
(return/persist the auth token), landing them on the board.
1.3. IF the email is already registered or invalid, or the password fails policy,
THEN THE SYSTEM SHALL reject with a field-level error and SHALL NOT create an
account.
1.4. THE SYSTEM SHALL provide a password **visibility toggle** on the signup
password field.
1.5. WHEN a user is created, THE SYSTEM SHALL seed their three default categories
— Random Thoughts, School, Personal — with their colours (see board 1.3).

### Requirement 2 — Log in

**Acceptance criteria**

2.1. THE SYSTEM SHALL present a login screen ("Yay, You're Back!") with email and
password and a **Login** action.
2.2. WHEN credentials are correct, THE SYSTEM SHALL start an authenticated session
and land the user on their board.
2.3. IF credentials are wrong, THEN THE SYSTEM SHALL show an error and SHALL NOT
authenticate.

### Requirement 3 — Navigate between signup and login

**Acceptance criteria**

3.1. THE SYSTEM SHALL link from signup to login ("We're already friends!") and
from login to signup ("Oops! I've never been here before").

### Requirement 4 — Access control

**Acceptance criteria**

4.1. THE SYSTEM SHALL require authentication for all notes/categories endpoints
and screens; an unauthenticated request SHALL receive 401 (API) or be sent
to signup/login (UI).
4.2. THE SYSTEM SHALL scope every notes/categories query to the authenticated
user; a user SHALL never see another user's data.

## Open questions

- [x] Auth mechanism: DRF **token** auth (simple, SPA-friendly) vs session/JWT?
      **Decided: DRF `TokenAuthentication`.** Token returned by signup/login,
      held in the session store (in-memory + rehydrate), attached as
      `Authorization: Token <token>` by `shared/api`.
- [x] Password policy (min length, etc.). **Decided: ≥8 chars, enforced via
      Django's `AUTH_PASSWORD_VALIDATORS` (`MinimumLengthValidator` len 8 +
      common/numeric validators).** Reported as a field-level error (1.3).
- [x] Is logout in scope? **Decided: backend only.** `POST /api/auth/logout/`
      deletes the caller's token → 204 and stays covered by backend tests, but
      **no UI exposes it** — the `features/log-out` slice was removed and the
      board topbar has no logout control. A session ends when the tab closes
      (the token lives in `sessionStorage`, per the storage decision in
      `design.md`). Re-adding a logout affordance means restoring that slice and
      wiring `clearSession()` to it; the endpoint is already there.
- [x] Does login show a password visibility toggle too? Figma frame is unlinked
      (see below). **Decided: yes — both screens reuse `shared/ui/password-input`
      for consistency and accessibility.**

## Figma status (resolved — task 11)

Figma file connected: `BZH4CuPAaC0S7hKoItTInX`. Auth screens diffed and restyled
against the exact frames — **signup 34:889** ("Yay, New Friend!"), **login 34:831**
("Yay, You're Back!"). Tokens (bg `#faf1e3`, serif heading `#88642a`, accent
`#957139`, Inria Serif + Inter, 384px card, pill button, outlined inputs) live in
`frontend/src/shared/ui/theme/theme.css`. Corner illustrations exported to
`frontend/public/auth/` (cats 34:899, cactus 143:244); password toggle mirrors the
peek glyph 143:247 as an inline eye icon.
