import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createStore } from './store.js';

const webDist = fileURLToPath(new URL('../../web/dist/', import.meta.url));
const reservedAliases = new Set(['api', 'health', 'assets']);
const aliasPattern = /^[A-Za-z0-9_-]{3,32}$/;

export function createApp({ store = createStore(), baseUrl } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    next();
  });

  const serialize = (link, req) => ({
    ...link,
    shortUrl: `${(baseUrl || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '')}/${link.code}`
  });

  app.get('/api/health', (req, res) => res.json({ data: { status: 'ok' } }));
  app.get('/api/links', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ data: store.list().map((link) => serialize(link, req)) });
  });
  app.post('/api/links', (req, res) => {
    const { url, customAlias } = req.body || {};
    if (typeof url !== 'string' || !url.trim() || url.length > 2048) {
      return res.status(400).json({ error: 'Provide a URL of up to 2048 characters.' });
    }
    let destination;
    try {
      destination = new URL(url.trim());
    } catch {
      return res.status(400).json({ error: 'Enter a valid HTTP or HTTPS URL.' });
    }
    if (!['http:', 'https:'].includes(destination.protocol) || destination.username || destination.password) {
      return res.status(400).json({ error: 'Use an HTTP or HTTPS URL without embedded credentials.' });
    }
    let alias;
    if (customAlias !== undefined && customAlias !== '') {
      if (typeof customAlias !== 'string' || !aliasPattern.test(customAlias)) {
        return res.status(400).json({ error: 'Custom aliases must use 3–32 letters, numbers, hyphens, or underscores.' });
      }
      if (reservedAliases.has(customAlias.toLowerCase())) {
        return res.status(400).json({ error: 'This custom alias is reserved.' });
      }
      alias = customAlias;
    }
    const link = store.create(destination.href, alias);
    if (!link) return res.status(409).json({ error: 'This custom alias is already in use.' });
    return res.status(201).json({ data: serialize(link, req) });
  });
  app.delete('/api/links/:code', (req, res) => {
    if (!store.delete(req.params.code)) return res.status(404).json({ error: 'Link not found.' });
    return res.status(204).end();
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.' }));

  if (existsSync(path.join(webDist, 'index.html'))) {
    app.use(express.static(webDist, { index: false, redirect: false }));
    app.get('/', (req, res) => res.sendFile(path.join(webDist, 'index.html')));
  } else {
    app.get('/', (req, res) => res.json({ data: { name: 'LinkForge API', status: 'ok' } }));
  }

  app.get('/:code', (req, res) => {
    const link = req.method === 'HEAD' ? store.get(req.params.code) : store.incrementClicks(req.params.code);
    if (!link) return res.status(404).json({ error: 'Link not found.' });
    res.set('Cache-Control', 'no-store');
    return res.redirect(302, link.url);
  });
  app.use((req, res) => res.status(404).json({ error: 'Not found.' }));
  app.use((error, req, res, next) => {
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' });
    if (error instanceof SyntaxError && error.status === 400) return res.status(400).json({ error: 'Request body must contain valid JSON.' });
    if (error instanceof URIError) return res.status(400).json({ error: 'Invalid URL encoding.' });
    console.error(error);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  });
  return app;
}
