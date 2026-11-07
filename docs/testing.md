# Testing guide

## Automated checks

Run `npm test` from the root after installing dependencies. Backend tests use real HTTP requests with fresh in-memory stores and ephemeral ports; they do not need a separately running API or external network access.

The live integration example is skipped by default. Start an instance, then run:

```sh
RUN_INTEGRATION=1 TEST_BASE_URL=http://localhost:3001 node --test tests/integration
```

It creates a unique test alias, checks its redirect without visiting the external destination, and deletes the link afterward. Use a development instance because the test temporarily changes its link collection.

## Browser acceptance checks

1. Run `npm run dev` and open the printed frontend URL.
2. Create a link with an HTTPS destination; verify it appears in the list and the copy button copies its short URL.
3. Create a custom alias, then attempt the same alias again; verify the conflict message is visible.
4. Submit an invalid URL and invalid alias; verify clear validation feedback.
5. Open a short URL, return to the dashboard, and refresh the list; verify its visit count increased.
6. Delete a link; verify it disappears and its short URL returns a missing-link error.
7. Check the layout at narrow mobile and desktop widths. Use the keyboard to reach every control and confirm visible focus states.
8. Stop the API and submit or refresh; verify the UI displays a recoverable error.
9. Run `npm run build` and `npm start`; repeat creation and redirect checks through the single Express origin.

There is no coverage threshold or browser automation suite configured. Add regression tests when changing API behavior and record manual UI checks in pull requests.
