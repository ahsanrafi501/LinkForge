import { createApp } from './app.js';

const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error('PORT must be an integer between 0 and 65535.');
}

if (process.env.BASE_URL) {
  const baseUrl = new URL(process.env.BASE_URL);
  if (!['http:', 'https:'].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash || baseUrl.pathname !== '/') {
    throw new Error('BASE_URL must be an HTTP or HTTPS origin, such as https://links.example.com.');
  }
}

const app = createApp({ baseUrl: process.env.BASE_URL });
const server = app.listen(port, () => {
  console.log(`LinkForge is running at http://localhost:${server.address().port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
