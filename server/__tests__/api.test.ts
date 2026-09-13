import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Server } from 'node:http';
import { app, studentRepo } from '../../server';

let server: Server;
let baseUrl: string;

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

test('API: GET /api/health returns health status', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'ok');
  assert.ok('hasGitHubToken' in data);
});

test('API: GET /api/leaderboard returns student list', async () => {
  const res = await fetch(`${baseUrl}/api/leaderboard`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data));
  assert.ok(data.length > 0);
  assert.ok(data[0].username);
  assert.ok('totalScore' in data[0]);
});

const AUTH_HEADER = {
  Authorization: `Bearer ${process.env.ADMIN_SECRET_KEY || 'techdana2026'}`
};

test('API: POST /api/students adds student and reflects in /api/leaderboard', async () => {
  const testStudent = {
    username: 'test-user-api',
    name: 'API Test Dev',
    commits: 25,
    streakDays: 5,
    githubUrl: 'https://github.com/test-user-api',
    avatarUrl: 'https://github.com/test-user-api.png'
  };

  const addRes = await fetch(`${baseUrl}/api/students`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...AUTH_HEADER
    },
    body: JSON.stringify(testStudent)
  });

  assert.strictEqual(addRes.status, 201);
  const created = await addRes.json();
  assert.strictEqual(created.username, 'test-user-api');
  assert.strictEqual(created.totalScore, 25 + 5 * 5); // 50

  // Verify in leaderboard
  const listRes = await fetch(`${baseUrl}/api/leaderboard`);
  const list = await listRes.json();
  const found = list.find((s: { username: string }) => s.username === 'test-user-api');
  assert.ok(found);

  // Clean up
  const delRes = await fetch(`${baseUrl}/api/students/${created.id}`, {
    method: 'DELETE',
    headers: AUTH_HEADER
  });
  assert.strictEqual(delRes.status, 200);
});


test('API: GET /api/students/sync-status returns sync telemetry', async () => {
  const statusRes = await fetch(`${baseUrl}/api/students/sync-status`);
  assert.strictEqual(statusRes.status, 200);
  const data = await statusRes.json();
  assert.ok('isSyncing' in data);
  assert.strictEqual(typeof data.isSyncing, 'boolean');
  assert.ok('cooldownRemainingSeconds' in data);
});
