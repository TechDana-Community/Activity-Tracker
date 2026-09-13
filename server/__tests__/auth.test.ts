import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Server } from 'node:http';
import { app } from '../../server';

let server: Server;
let baseUrl: string;
const VALID_PIN = process.env.ADMIN_SECRET_KEY || 'techdana2026';

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        baseUrl = `http://127.0.0.1:${address.port}`;
      }
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

test('Auth Middleware: public endpoints remain accessible without authentication', async () => {
  const healthRes = await fetch(`${baseUrl}/api/health`);
  assert.strictEqual(healthRes.status, 200);

  const leaderboardRes = await fetch(`${baseUrl}/api/leaderboard`);
  assert.strictEqual(leaderboardRes.status, 200);

  const syncStatusRes = await fetch(`${baseUrl}/api/students/sync-status`);
  assert.strictEqual(syncStatusRes.status, 200);
});

test('Auth Middleware: mutating endpoints reject requests without Authorization header (401)', async () => {
  // 1. Add student without token
  const addRes = await fetch(`${baseUrl}/api/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'hacker' })
  });
  assert.strictEqual(addRes.status, 401);
  const addBody = await addRes.json();
  assert.ok(addBody.error.includes('Unauthorized'));

  // 2. Delete student without token
  const delRes = await fetch(`${baseUrl}/api/students/123`, {
    method: 'DELETE'
  });
  assert.strictEqual(delRes.status, 401);

  // 3. Sync all without token
  const syncRes = await fetch(`${baseUrl}/api/students/sync-all`, {
    method: 'POST'
  });
  assert.strictEqual(syncRes.status, 401);
});

test('Auth Middleware: mutating endpoints reject invalid tokens (401)', async () => {
  const res = await fetch(`${baseUrl}/api/students`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer wrong-pin-123'
    },
    body: JSON.stringify({ username: 'attacker' })
  });
  assert.strictEqual(res.status, 401);
});

test('Auth Middleware: POST /api/admin/verify validates PIN correctly', async () => {
  // Invalid PIN
  const badRes = await fetch(`${baseUrl}/api/admin/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: 'wrong-pin' })
  });
  assert.strictEqual(badRes.status, 401);

  // Valid PIN
  const goodRes = await fetch(`${baseUrl}/api/admin/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: VALID_PIN })
  });
  assert.strictEqual(goodRes.status, 200);
  const goodBody = await goodRes.json();
  assert.strictEqual(goodBody.valid, true);
});

test('Auth Middleware: mutating endpoints accept valid Authorization Bearer token', async () => {
  const res = await fetch(`${baseUrl}/api/students`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${VALID_PIN}`
    },
    body: JSON.stringify({
      username: 'auth-test-user',
      name: 'Auth Dev',
      commits: 10,
      streakDays: 2
    })
  });
  assert.strictEqual(res.status, 201);
  const created = await res.json();
  assert.strictEqual(created.username, 'auth-test-user');
});
