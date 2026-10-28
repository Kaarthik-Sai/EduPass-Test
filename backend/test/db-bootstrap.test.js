const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'production';
process.env.MONGO_URI = '';
const app = require('../app');
let server;
let base;
before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => new Promise((resolve) => server.close(resolve)));

test('API returns a retryable 503 when MongoDB configuration is missing', async () => {
  const response = await fetch(`${base}/categories`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    success: false,
    message: 'Service temporarily unavailable. Please try again.',
  });
});

test('health remains available while the database is unavailable', async () => {
  const response = await fetch(`${base}/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'ok');
});
