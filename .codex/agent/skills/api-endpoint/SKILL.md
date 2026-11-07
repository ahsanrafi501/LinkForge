---
name: api-endpoint
description: "Design, implement, modify, or test LinkForge Express API endpoints for short-link creation, listing, redirects, health checks, and deletion. Use when changing request validation, response envelopes, routing, link storage, or API tests."
---

# LinkForge API Endpoint Workflow

Use this skill when working on the Express backend in `server/`.

## Repository Context

- The application factory and routes are in `server/src/app.js`.
- The process entry point and `PORT`/`BASE_URL` validation are in `server/src/server.js`.
- Link persistence is an in-memory store in `server/src/store.js`; do not assume data survives restarts.
- Black-box HTTP tests are in `server/test/` and use Node's built-in test runner.
- The React frontend calls the API with relative URLs from `web/src/`.

## API Contract

Keep successful responses shaped as `{ "data": ... }` and failures as `{ "error": "message" }`.

| Method | Path | Expected behavior |
| --- | --- | --- |
| `GET` | `/api/health` | Return `{ data: { status: "ok" } }`. |
| `GET` | `/api/links` | Return all links, newest first, with serialized `shortUrl`; disable caching. |
| `POST` | `/api/links` | Validate and create a link; return `201` and the link in `data`. |
| `DELETE` | `/api/links/:code` | Delete a link; return `204` with no body, or `404`. |
| `GET` | `/:code` | Redirect with `302` and increment clicks. |
| `HEAD` | `/:code` | Redirect with `302` without incrementing clicks. |

## Procedure

1. **Inspect existing behavior first.** Read the relevant route in `server/src/app.js`, the corresponding store method in `server/src/store.js`, frontend callers, and nearby tests before editing.
2. **Preserve routing boundaries.** Keep `/api/*` routes ahead of short-code redirects. Unknown API routes must return a JSON `404`; unknown non-API paths must also return a JSON `404`.
3. **Validate at the HTTP boundary.** Handle missing or malformed JSON explicitly. For link creation, accept absolute `http:` or `https:` URLs up to 2,048 characters and reject embedded credentials. Custom aliases, when provided, must match 3–32 letters, numbers, hyphens, or underscores and must not be `api`, `health`, or `assets`.
4. **Use the store for state changes.** Keep storage logic in `server/src/store.js`; use the app's injected `store` option so tests can create isolated instances. Treat a failed custom-alias insertion as a `409` conflict.
5. **Serialize public links consistently.** Preserve link metadata (`id`, `code`, `url`, `clicks`, and `createdAt`) and compute `shortUrl` from `BASE_URL` when configured, otherwise from the request origin.
6. **Expose errors clearly.** Return the established status code and `{ error }` envelope for validation (`400`), conflicts (`409`), missing links (`404`), oversized JSON (`413`), malformed JSON (`400`), and unexpected failures (`500`). Do not silently fall back.
7. **Add or update black-box tests.** Cover the success path, invalid input, response status and envelope, state changes, duplicate aliases, redirects, and any changed edge cases in `server/test/api.test.js`.
8. **Run targeted validation.** From the repository root, run `npm test`. If the frontend or response contract changed, also run `npm run build`.
9. **Update related documentation.** Keep the API table, examples, validation rules, and known limitations in `README.md` consistent with the implementation.

## Implementation Checklist

- [ ] Route is registered in the correct order.
- [ ] Request input is type-checked and bounded.
- [ ] Success and error responses use the repository envelopes.
- [ ] Store state is isolated through dependency injection.
- [ ] Redirect and click-count behavior is preserved, including `HEAD`.
- [ ] Tests cover both normal and rejected requests.
- [ ] `npm test` passes, plus `npm run build` when relevant.
