# LinkForge

**Create short links, customize aliases, and track visits from a responsive dashboard.**

LinkForge is a full-stack URL shortener built with React, Express, and Vite. It brings link creation, copying, visit counts, and deletion into a single interface, with a JSON API powering the frontend.

[Live Demo](https://linkforge-xi.vercel.app) · [API Reference](#api-reference) · [Testing Guide](docs/testing.md)

> **Demo storage:** Links are stored in memory. They can disappear when the backend restarts or when Vercel starts another function instance. All visitors share the same collection and can delete links.

## Features

- Shorten HTTP and HTTPS URLs with automatically generated codes.
- Choose a custom alias with duplicate and reserved-name validation.
- Copy short links directly from the dashboard.
- View visit counts and link creation dates.
- Delete links and disable their redirects.
- Check redirects with `HEAD` without increasing visit counts.
- Run the frontend and API together locally or deploy both to Vercel.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, CSS, Vite 6 |
| Backend | Node.js, Express 5 |
| Storage | In-memory JavaScript `Map` |
| Testing | Node.js test runner and HTTP integration tests |
| Deployment | Vercel static frontend and Node.js function |
| Package management | npm workspaces |

## Getting Started

### Prerequisites

- Node.js 22.12 or newer
- npm
- Git

### Installation

```sh
git clone https://github.com/ahsanrafi501/LinkForge.git
cd LinkForge
npm ci
npm run dev
```

Open **http://localhost:5173**. The API runs at **http://localhost:3001**, and Vite proxies frontend API requests to it. If port 5173 is occupied, use the frontend URL printed in the terminal.

### Run a Production Build Locally

```sh
npm run build
npm start
```

Open **http://localhost:3001**. Express serves the compiled React frontend alongside the API and short-link redirects.

### Available Commands

| Command | Description |
| --- | --- |
| `npm ci` | Install workspace dependencies from the lockfile |
| `npm run dev` | Start the API and Vite development server together |
| `npm test` | Run backend tests and opt-in integration tests, skipped by default |
| `npm run build` | Build the frontend into `web/dist/` |
| `npm start` | Start the API and serve the frontend if a build exists |

## Configuration

The backend reads configuration from its process environment.

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3001` | Listening port for the standalone Express server |
| `BASE_URL` | Request origin | Public origin used to generate short URLs |

Example:

```sh
PORT=3001 BASE_URL=http://localhost:3001 npm start
```

`BASE_URL` should be an HTTP or HTTPS origin, such as `https://links.example.com`, without credentials, a query string, or a path. The standalone server validates it on startup.

[server/.env.example](server/.env.example) documents the available settings. Environment files are not loaded automatically; export variables in your shell or configure them through your hosting provider. If you change the API development port, update the proxy targets in [web/vite.config.js](web/vite.config.js).

## API Reference

Successful JSON responses use `{ "data": ... }`; errors use `{ "error": "message" }`. Successful deletion returns no body.

| Method | Endpoint | Response |
| --- | --- | --- |
| `GET` | `/api/health` | `200` — API health status |
| `GET` | `/api/links` | `200` — links, newest first, with metadata and visit counts |
| `POST` | `/api/links` | `201` — newly created link |
| `DELETE` | `/api/links/:code` | `204` — deleted; `404` if missing |
| `GET` | `/:code` | `302` — redirect and increment the visit count |
| `HEAD` | `/:code` | `302` — redirect headers without counting a visit |

### Create a Link

```sh
curl -X POST http://localhost:3001/api/links \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/articles","customAlias":"articles"}'
```

Example response:

```json
{
  "data": {
    "id": "a-generated-uuid",
    "code": "articles",
    "url": "https://example.com/articles",
    "clicks": 0,
    "createdAt": "2026-11-07T00:00:00.000Z",
    "shortUrl": "http://localhost:3001/articles"
  }
}
```

Omit `customAlias` to generate a code automatically.

### List, Inspect, and Delete

```sh
# List links
curl http://localhost:3001/api/links

# Inspect redirect headers without counting a visit
curl -I http://localhost:3001/articles

# Delete a link
curl -i -X DELETE http://localhost:3001/api/links/articles
```

### Validation and Errors

- Destinations must be absolute HTTP or HTTPS URLs, up to 2,048 characters, without embedded credentials.
- Custom aliases must contain 3–32 letters, numbers, hyphens, or underscores.
- `api`, `health`, and `assets` are reserved aliases, regardless of capitalization.
- Invalid input or malformed JSON returns `400`.
- An alias already in use returns `409`.
- Missing links or routes return `404`.
- JSON request bodies larger than 16 KB return `413`.
- Unexpected server failures return `500` with a generic error message.

## Testing

Run the API test suite:

```sh
npm test
```

Backend tests use isolated stores and temporary local HTTP servers. Coverage includes creation, validation, duplicate aliases, redirect behavior, visit counts, deletion, response envelopes, request errors, and store isolation.

To run the live integration test, start the application in another terminal, then run:

```sh
RUN_INTEGRATION=1 TEST_BASE_URL=http://localhost:3001 node --test tests/integration/live.test.js
```

The integration test creates a temporary link, checks its redirect, and deletes it. See the [testing guide](docs/testing.md) for manual browser checks.

## Project Structure

```text
LinkForge/
├── api/
│   └── index.js           # Vercel function entry point
├── docs/
│   └── testing.md         # Test plan and browser checks
├── scripts/
│   └── dev.js             # Combined development process
├── server/
│   ├── src/
│   │   ├── app.js         # Express app factory and routes
│   │   ├── server.js      # Standalone server and configuration
│   │   └── store.js       # In-memory link storage
│   └── test/              # Backend HTTP tests
├── tests/integration/     # Opt-in live integration tests
├── web/
│   ├── src/               # React components and styles
│   └── vite.config.js     # Development server and API proxy
├── package.json           # Workspace scripts
└── vercel.json            # Full-stack deployment configuration
```

The frontend makes relative API requests. Express handles validation, link storage, alias conflicts, redirects, and visit counts. The app factory accepts an injected store to keep backend tests isolated.

## Deployment

The live demo is hosted at **https://linkforge-xi.vercel.app**.

For a Vercel deployment, use the repository root. The committed configuration installs dependencies with `npm ci`, builds the frontend with `npm run build`, serves `web/dist/`, and forwards API requests and short-code paths to `api/index.js`.

No environment variables are required. Optionally set `BASE_URL` to your public HTTPS origin. `PORT` applies only to the standalone server.

The current deployment was uploaded directly. To enable deployments from future GitHub pushes, install Vercel's GitHub integration and connect this repository to the Vercel project.

## Limitations

LinkForge currently serves as a demo application:

- Storage is temporary and is not shared between Vercel function instances. Links and visit counts may disappear on cold starts, scaling, or redeployment.
- There are no user accounts or access controls. Anyone with access to the API can list, create, or delete links.
- Rate limiting and abuse protection are not implemented in the application.

For a production service, add durable shared storage, authorization, and abuse controls before relying on short links for long-term use.

## Contributing

Contributions are welcome. Review [AGENTS.md](AGENTS.md) for repository conventions, keep changes focused, and include relevant tests for backend behavior changes. Run `npm test` and `npm run build` before opening a pull request. Include screenshots when changing the interface.

## License

No license has been specified in this repository.
