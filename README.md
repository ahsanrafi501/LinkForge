# LinkForge

A URL shortener built with React and Express. Create a short link, choose an optional custom alias, copy it, track visits, and delete links from a responsive dashboard.

## Run locally

Use Node.js 22.12 or newer and npm. From the repository root:

```sh
npm install
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`). The API runs on `http://localhost:3001`; Vite proxies frontend API requests to it.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the frontend and backend together |
| `npm test` | Run API tests and skipped-by-default live integration tests |
| `npm run build` | Build the React frontend into `web/dist/` |
| `npm start` | Start Express and serve the built frontend when available |

For a single-server run, execute `npm run build` followed by `npm start`, then open `http://localhost:3001`.

## Configuration

The backend reads environment variables from its process:

- `PORT`: listening port, default `3001`.
- `BASE_URL`: optional public origin used in generated short URLs, such as `https://links.example.com`. Without it, URLs use the incoming request origin.

For example:

```sh
PORT=3001 BASE_URL=http://localhost:3001 npm start
```

Do not commit local environment files or credentials. Changing the backend port also requires updating the Vite development proxy.

## Project structure

```text
server/src/          Express app, startup, and in-memory link store
server/test/         Isolated HTTP API tests
web/src/            React UI and styles
web/public/         Static assets, if added
tests/integration/  Opt-in tests against a running server
docs/               API and validation notes
```

The frontend uses relative API requests. Express owns link validation, alias uniqueness, redirects, and visit counts. API responses use `{ "data": ... }` for success and `{ "error": "message" }` for errors; successful deletion has no body.

## API

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/api/health` | Report API health |
| `GET` | `/api/links` | List links and visit counts |
| `POST` | `/api/links` | Create a short link |
| `DELETE` | `/api/links/:code` | Delete a link; return `204` with no body, or `404` with `{ "error": "Link not found." }` |
| `GET` | `/:code` | Redirect to the destination and count a visit |

```sh
curl -X POST http://localhost:3001/api/links \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/articles","customAlias":"articles"}'
curl http://localhost:3001/api/links
curl -I http://localhost:3001/articles
curl -X DELETE http://localhost:3001/api/links/articles
```

Destinations must be absolute HTTP or HTTPS URLs of up to 2,048 characters, without embedded credentials. Optional aliases must contain 3–32 letters, numbers, hyphens, or underscores. `api`, `health`, and `assets` are reserved. Alias collisions return `409`; validation failures return `400`; missing links return `404`. JSON bodies larger than 16 KB return `413`. A `HEAD` request checks a redirect without increasing its visit count.

## Validation

`npm test` uses Node's built-in test runner. Route tests create isolated stores and ephemeral HTTP servers, covering creation, validation, duplicate aliases, redirects, visit counts, deletion, JSON errors, and store isolation.

To test a running instance:

```sh
RUN_INTEGRATION=1 TEST_BASE_URL=http://localhost:3001 node --test tests/integration
```

See [the testing guide](docs/testing.md) for browser checks.

## Vercel deployment

Deploy from the repository root. `vercel.json` builds the React frontend into `web/dist` and routes API requests and short-link redirects to the Express app through `api/index.js`. No environment variables are required; optionally configure `BASE_URL` with your public HTTPS origin.

The in-memory store is temporary and is not shared between function instances. Links and click counts can disappear on cold starts, scaling, or redeployments. Use persistent storage before relying on deployed short links.

## Current limitations

Links are stored in memory and disappear when the server restarts. All visitors share one link collection; there are no user accounts or access controls. This is a local/demo application. Add persistent storage, authorization, abuse controls, and deployment configuration before operating a public service. No license has been selected.
