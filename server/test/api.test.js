import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { createStore } from '../src/store.js';

async function fixture(t, options = {}) {
  const server = createApp({ store: createStore(), ...options }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = (path, options) => fetch(`${origin}${path}`, options);
  const create = (body) => request('/api/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { request, create, origin };
}

test('health and a new store return predictable data envelopes', async (t) => {
  const { request } = await fixture(t);
  const health = await request('/api/health');
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { data: { status: 'ok' } });
  assert.deepEqual(await (await request('/api/links')).json(), { data: [] });
});

test('generated links have metadata and redirect while counting visits', async (t) => {
  const { create, request, origin } = await fixture(t);
  const response = await create({ url: 'https://example.com/articles?from=linkforge' });
  assert.equal(response.status, 201);
  const { data: link } = await response.json();
  assert.equal(link.url, 'https://example.com/articles?from=linkforge');
  assert.match(link.code, /^[A-Za-z0-9_-]+$/);
  assert.ok(link.id);
  assert.equal(link.clicks, 0);
  assert.ok(Number.isFinite(Date.parse(link.createdAt)));
  assert.equal(link.shortUrl, `${origin}/${link.code}`);
  const redirect = await request(`/${link.code}`, { redirect: 'manual' });
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get('location'), link.url);
  const { data } = await (await request('/api/links')).json();
  assert.equal(data.length, 1);
  assert.equal(data[0].clicks, 1);
});

test('custom aliases use configured public base URLs and cannot collide', async (t) => {
  const { create } = await fixture(t, { baseUrl: 'https://short.example' });
  const response = await create({ url: 'http://example.com/', customAlias: 'my-link_123' });
  assert.equal(response.status, 201);
  const { data } = await response.json();
  assert.equal(data.code, 'my-link_123');
  assert.equal(data.shortUrl, 'https://short.example/my-link_123');
  const duplicate = await create({ url: 'https://another.example/', customAlias: 'my-link_123' });
  assert.equal(duplicate.status, 409);
  assert.equal(typeof (await duplicate.json()).error, 'string');
});

test('invalid destinations are rejected without creating links', async (t) => {
  const { create, request } = await fixture(t);
  for (const url of [undefined, '', 'not-a-url', 'javascript:alert(1)', 'ftp://example.com', 'https://user:password@example.com/', `https://example.com/${'a'.repeat(2048)}`, 42]) {
    const response = await create({ url });
    assert.equal(response.status, 400, `url ${String(url)}`);
    assert.equal(typeof (await response.json()).error, 'string');
  }
  assert.deepEqual(await (await request('/api/links')).json(), { data: [] });
});

test('invalid and reserved aliases are rejected', async (t) => {
  const { create } = await fixture(t);
  for (const customAlias of ['ab', 'a'.repeat(33), 'has space', 'slash/path', 'api', 'health', 'assets']) {
    const response = await create({ url: 'https://example.com/', customAlias });
    assert.equal(response.status, 400, `alias ${customAlias}`);
    assert.equal(typeof (await response.json()).error, 'string');
  }
});

test('deletion removes the link and future redirects return 404', async (t) => {
  const { create, request } = await fixture(t);
  await create({ url: 'https://example.com/', customAlias: 'remove-me' });
  const response = await request('/api/links/remove-me', { method: 'DELETE' });
  assert.equal(response.status, 204);
  assert.equal(await response.text(), '');
  assert.deepEqual(await (await request('/api/links')).json(), { data: [] });
  assert.equal((await request('/remove-me', { redirect: 'manual' })).status, 404);
  const missing = await request('/api/links/remove-me', { method: 'DELETE' });
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: 'Link not found.' });
});

test('deleting a missing link preserves other links', async (t) => {
  const { create, request } = await fixture(t);
  const { data: link } = await (await create({ url: 'https://example.com/', customAlias: 'keep-me' })).json();
  const response = await request('/api/links/missing-link', { method: 'DELETE' });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Link not found.' });
  assert.deepEqual(await (await request('/api/links')).json(), { data: [link] });
  assert.equal((await request('/keep-me', { redirect: 'manual' })).status, 302);
});

test('unknown API routes and unknown links return JSON errors', async (t) => {
  const { request } = await fixture(t);
  for (const path of ['/missing-link', '/api/missing']) {
    const response = await request(path, { redirect: 'manual' });
    assert.equal(response.status, 404);
    assert.equal(typeof (await response.json()).error, 'string');
  }
});

test('malformed JSON returns a client error', async (t) => {
  const { request } = await fixture(t);
  const response = await request('/api/links', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json'
  });
  assert.equal(response.status, 400);
  assert.equal(typeof (await response.json()).error, 'string');
});

test('app stores are isolated', async (t) => {
  const first = await fixture(t);
  const second = await fixture(t);
  await first.create({ url: 'https://example.com/', customAlias: 'isolated' });
  assert.deepEqual(await (await second.request('/api/links')).json(), { data: [] });
});

test('HEAD resolves a short link without counting a visit', async (t) => {
  const { create, request } = await fixture(t);
  await create({ url: 'https://example.com/', customAlias: 'head-check' });
  const response = await request('/head-check', { method: 'HEAD', redirect: 'manual' });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://example.com/');
  assert.equal(await response.text(), '');
  const { data } = await (await request('/api/links')).json();
  assert.equal(data[0].clicks, 0);
});

test('oversized JSON is rejected with a JSON error', async (t) => {
  const { create } = await fixture(t);
  const response = await create({ url: `https://example.com/${'a'.repeat(17000)}` });
  assert.equal(response.status, 413);
  assert.equal(typeof (await response.json()).error, 'string');
});
