import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/server.js';
import { createServer } from 'node:http';

async function withServer(fn) {
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try { await fn(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

test('health endpoint returns healthy status', async () => {
  await withServer(async base => {
    const response = await fetch(`${base}/api/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.status, 'healthy');
    assert.equal(body.service, 'deploymate-api');
  });
});

test('deployment endpoint returns deployment records', async () => {
  await withServer(async base => {
    const response = await fetch(`${base}/api/deployments`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body.deployments));
    assert.ok(body.deployments.length > 0);
  });
});
