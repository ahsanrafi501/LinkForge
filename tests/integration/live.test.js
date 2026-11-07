import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';

test('live server creates, redirects, and deletes a short link', {
  skip: process.env.RUN_INTEGRATION !== '1'
}, async () => {
  const origin = process.env.TEST_BASE_URL || 'http://localhost:3001';
  const alias = `test-${randomUUID().slice(0, 8)}`;
  let created = false;
  try {
    const response = await fetch(`${origin}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/', customAlias: alias })
    });
    assert.equal(response.status, 201);
    created = true;
    const { data } = await response.json();
    assert.equal(data.code, alias);
    const redirect = await fetch(`${origin}/${alias}`, { redirect: 'manual' });
    assert.equal(redirect.status, 302);
    assert.equal(redirect.headers.get('location'), 'https://example.com/');
  } finally {
    if (created) {
      const deletion = await fetch(`${origin}/api/links/${alias}`, { method: 'DELETE' });
      assert.equal(deletion.status, 204);
    }
  }
});
