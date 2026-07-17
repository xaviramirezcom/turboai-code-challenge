# Design — Auth

Keep it small and standard: Django's user, DRF token auth, a seed-on-signup hook.

## Domain / data

- Reuse Django's `User` (email as the login identifier — configure email-based
  auth or a thin custom user). No custom domain entity needed beyond that.
- On user creation, seed `Category` rows (Random Thoughts / School / Personal)
  for that owner. This is an **application** concern (a `register` use case), not
  a Django signal — keep it explicit and testable (consistent with "no hidden
  signals").

## API contract (DRF)

| Method | Path                | Body                | Success                                | Serves        |
| ------ | ------------------- | ------------------- | -------------------------------------- | ------------- |
| POST   | `/api/auth/signup/` | `{email, password}` | 201 `{token, user}` + seeds categories | 1.1–1.3, 1.5  |
| POST   | `/api/auth/login/`  | `{email, password}` | 200 `{token, user}`                    | 2.1–2.3       |
| POST   | `/api/auth/logout/` | –                   | 204 (invalidate token)                 | open question |

- Auth: `Authorization: Token <token>` (DRF `TokenAuthentication`) _(confirm
  choice)_. All other endpoints use `IsAuthenticated`.
- Passwords hashed by Django (`set_password` / `make_password`) — never stored or
  logged in plain text (the observability layer redacts `password`).

## Application

`AuthService.register(email, password)` → create user (hashed pw) + seed default
categories atomically (one `transaction.atomic`), issue token. `login(email,
password)` → authenticate + issue token. Publishes `user.registered` /
`user.logged_in` events.

## Frontend (FSD)

| Piece                   | Layer/slice (segment)                  | States                    | Figma                                                                                                                |
| ----------------------- | -------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Signup form             | `features/sign-up` (ui/, api/, model/) | idle, submitting, invalid | [frame 34:889](https://www.figma.com/design/BZH4CuPAaC0S7hKoItTInX/Notes-Taking-App-Challenge--Copy-?node-id=34-889) |
| Login form              | `features/log-in` (ui/, api/, model/)  | idle, submitting, invalid | [frame 34:831](https://www.figma.com/design/BZH4CuPAaC0S7hKoItTInX/Notes-Taking-App-Challenge--Copy-?node-id=34-831) |
| Password field + toggle | `shared/ui/password-input`             | shown/hidden              | peek icon 143:247                                                                                                    |

Design tokens live in `shared/ui/theme/theme.css` (colours `#faf1e3` bg,
`#88642a` serif heading, `#957139` accent; Inria Serif + Inter). Corner
illustrations are exported to `frontend/public/auth/` (cats 34:899, cactus
143:244); the password toggle is an inline eye icon (the Figma glyph 143:247).
| Auth session (token, current user) | `entities/session` (model/, api/) | – | – |
| Route guard | `app/` layout / middleware | authed / not | – |

- The token is held in the session store; attach it in `shared/api` (the single
  client) as the `Authorization` header. Do not scatter auth handling.
- Unauthenticated access to app routes redirects to `/login`.
- Storage of the token: prefer an httpOnly cookie if using session/JWT; for token
  auth in a SPA, in-memory + refresh-on-load is safer than localStorage
  _(decide with the auth-mechanism open question; avoid localStorage for tokens)_.
  **Decided:** the token + user live in-memory (`entities/session` store, synced
  to `shared/api`) and are mirrored to **`sessionStorage`** (per-tab, cleared on
  tab close — not `localStorage`). A root `SessionProvider` calls `rehydrate()`
  once on load so a page refresh keeps the user signed in without a whoami
  round-trip. Logout clears both the memory store and `sessionStorage`.

## Testing strategy

- Application: `register` creates a hashed-password user AND seeds exactly the 3
  categories, atomically (failure seeds nothing); duplicate email rejected;
  `login` rejects bad credentials.
- Interface: signup 201 + token + categories exist; duplicate → 400; login 200 /
  401; a protected endpoint returns 401 without a token and 200 with one; user B
  cannot read user A's notes (404/empty).
- Frontend: signup/login submit (mocked api), invalid shows errors, toggle
  reveals/hides password, successful auth routes to the board, guard redirects.
- Security: assert no password/token appears in any `ErrorLog`/`RequestLog` row.
