# Tasks — Auth

Test-first, per layer. Build this **before** notes/board (it owns the user +
seeds categories that the other specs depend on).

## Backend

- [x] 1. User setup (email login) + DRF token auth wired in settings.
     _Covers: 4.1_ · _Tests: unauthenticated protected request → 401
     (`test_protected_endpoint_requires_authentication`)_
- [x] 2. `application/`: `AuthService.register` (hashed pw + seed 3 categories,
     atomic) and `login`. _Covers: 1.2, 1.3, 1.5, 2.2, 2.3_ · _Tests
     (`accounts/tests/test_auth_service.py`): register seeds exactly 3 categories;
     atomic when seeding fails; duplicate + weak-password rejected; bad login
     rejected_
- [x] 3. `interface/`: `POST /api/auth/signup|login|logout`, serializers,
     permissions default `IsAuthenticated`. _Covers: 1.1–1.3, 2.1–2.3, 4.1, 4.2_ ·
     _Tests (`test_auth_api.py`): 201+token+3 categories; 400 dup/invalid/weak;
     200/401 login; 204 logout; owner-scoping (`test_category_repository.py`);
     no-secret-leakage_

## Frontend — FSD slices

- [x] 4. `shared/ui/password-input` with visibility toggle. _Covers: 1.4_ ·
     _Figma: unlinked (see requirements.md → Figma status)_ · _Tests: toggles masking_
- [x] 5. `entities/session`: token + current user store; attach `Authorization`
     in `shared/api`. _Covers: 4.1_ · _Tests: header attached; cleared on logout_
- [x] 6. `features/sign-up` + `features/log-in` (+ `log-out`, `require-auth`)
     forms; navigation links; route guard. _Covers: 1.1–1.3, 2.1–2.3, 3.1, 4.1_ ·
     _Figma: unlinked_ · _Tests (mocked api): submit, invalid errors, links switch
     screens, success → board, guard redirects_

## Verification

- [x] 7. Traceability: every criterion (1.1–4.2) has ≥1 test naming its ID.
- [x] 8. `/verify` green (backend `lint-imports`, frontend `npm run arch`;
     backend coverage 98.7%, frontend 94%).
- [x] 9. No secret leakage: `test_password_never_appears_in_any_log_row` plants a
     password and asserts it appears in no RequestLog/EventLog/ErrorLog row.
- [x] 10. Resolved open questions (auth mechanism, password policy, logout scope,
      login toggle) — reflected in `requirements.md`.
- [x] 11. Auth screens diffed against Figma — **done**. Restyled to frames
      34:889 (signup) / 34:831 (login): cream `#faf1e3`, serif `#88642a` heading,
      `#957139` outlined inputs + pill button, placeholder-labels, corner
      illustrations, eye peek toggle. Tokens in `shared/ui/theme/theme.css`.
