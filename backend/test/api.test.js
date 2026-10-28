process.env.NODE_ENV = 'test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app');
let server;
let base;
before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => new Promise((resolve) => server.close(resolve)));

test('health endpoint reports API status without MongoDB', async () => {
  const response = await fetch(`${base}/health`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.success, true);
  assert.equal(data.status, 'ok');
});

test('protected categories endpoint rejects anonymous requests', async () => {
  const response = await fetch(`${base}/categories`);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).success, false);
});

test('login validates required credentials before querying MongoDB', async () => {
  const response = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
  assert.equal(response.status, 422);
  assert.equal((await response.json()).message, 'Validation failed');
});

test('unknown API routes return a consistent 404 response', async () => {
  const response = await fetch(`${base}/does-not-exist`);
  assert.equal(response.status, 404);
  assert.equal((await response.json()).success, false);
});
