# Repository Guidelines

## Project Structure & Module Organization

LinkWeb is a full-stack URL shortener. The Express backend lives in `server/`, with routes in `server/src/server.js`, in-memory storage in `server/src/store.js`, and backend tests in `server/test/`. The React frontend lives in `web/`, with app code in `web/src/`. Integration examples and test planning live in `tests/integration/` and `docs/`.

## Build, Test, and Development Commands

- `npm install --prefix server` - install backend dependencies.
- `npm install --prefix web` - install frontend dependencies.
- `npm run dev` - run the API and Vite frontend together.
- `npm start` - start the Express API only.
- `npm test` - run backend tests and skipped-by-default integration examples.
- `npm run build` - build the React frontend.

## Coding Style & Naming Conventions

Use ES modules and modern JavaScript. Keep indentation at 2 spaces. Use `camelCase` for variables and functions, `PascalCase` for React components, and descriptive file names such as `App.jsx`, `server.js`, or `store.js`. API responses should always be shaped as `{ "data": ... }` or `{ "error": ... }`.

## Testing Guidelines

Tests use Node's built-in runner with `node --test`. Add backend route tests in `server/test/` when behavior changes. Keep black-box integration examples in `tests/integration/`; they are skipped unless the related `RUN_*` environment variable is set.

## Commit & Pull Request Guidelines

The current history uses concise imperative commits, such as `Initial commit`. Continue with messages like `Add shorten endpoint` or `Build React shortener UI`. Pull requests should include a short summary, test results, setup notes, and screenshots for UI changes.

## Security & Configuration Tips

Do not commit `.env` files or secrets. Use `PORT` and `BASE_URL` for backend configuration. The current store is in-memory, so links reset when the server restarts.