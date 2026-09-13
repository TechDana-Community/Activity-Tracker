import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { initSchema, seedInitialStudents, StudentRepository } from '../db';
import { SyncCoordinator, SyncConflictError, SyncCooldownError } from '../services/sync';
import { Student } from '../../src/types';
import { GitHubUserData } from '../services/github';

const testCohort: Student[] = [
  {
    id: 's-1',
    name: 'Alice Dev',
    username: 'alice',
    githubUrl: 'https://github.com/alice',
    avatarUrl: 'https://github.com/alice.png',
    commits: 10,
    streakDays: 2,
    lastActive: 'yesterday'
  },
  {
    id: 's-2',
    name: 'Bob Coder',
    username: 'bob',
    githubUrl: 'https://github.com/bob',
    avatarUrl: 'https://github.com/bob.png',
    commits: 20,
    streakDays: 3,
    lastActive: 'yesterday'
  }
];

function createTestRepo(): StudentRepository {
  const db = new DatabaseSync(':memory:');
  initSchema(db);
  seedInitialStudents(db, testCohort);
  return new StudentRepository(db);
}

test('Sync Engine: successfully synchronizes all students and updates metrics in DB', async () => {
  const repo = createTestRepo();

  // Mock fetcher that increments metrics
  const mockFetcher = async (username: string): Promise<GitHubUserData> => {
    if (username === 'alice') {
      return {
        username: 'alice',
        name: 'Alice Dev',
        avatarUrl: 'https://github.com/alice.png',
        githubUrl: 'https://github.com/alice',
        commits: 50,
        streakDays: 10,
        totalScore: 100, // 50 + 10*5
        lastActive: 'today',
        publicRepos: 12
      };
    }
    return {
      username: 'bob',
      name: 'Bob Coder',
      avatarUrl: 'https://github.com/bob.png',
      githubUrl: 'https://github.com/bob',
      commits: 80,
      streakDays: 5,
      totalScore: 105, // 80 + 5*5
      lastActive: 'today',
      publicRepos: 8
    };
  };

  const coordinator = new SyncCoordinator({
    fetchFn: mockFetcher,
    pacingMs: 0,
    cooldownMs: 60000
  });

  const stats = await coordinator.syncAll(repo);

  assert.strictEqual(stats.total, 2);
  assert.strictEqual(stats.updated, 2);
  assert.strictEqual(stats.failed, 0);
  assert.strictEqual(stats.errors.length, 0);

  // Verify in repository
  const alice = repo.getStudentByUsername('alice');
  assert.strictEqual(alice?.commits, 50);
  assert.strictEqual(alice?.streakDays, 10);
  assert.strictEqual(alice?.totalScore, 100);

  const bob = repo.getStudentByUsername('bob');
  assert.strictEqual(bob?.commits, 80);
  assert.strictEqual(bob?.streakDays, 5);
  assert.strictEqual(bob?.totalScore, 105);
});

test('Sync Engine: fault tolerance - single student failure does not abort sync loop', async () => {
  const repo = createTestRepo();

  // alice fails (e.g. 404 deleted account), bob succeeds
  const mockFetcher = async (username: string): Promise<GitHubUserData> => {
    if (username === 'alice') {
      throw new Error('GitHub user "alice" was not found (404)');
    }
    return {
      username: 'bob',
      name: 'Bob Coder',
      avatarUrl: 'https://github.com/bob.png',
      githubUrl: 'https://github.com/bob',
      commits: 90,
      streakDays: 6,
      totalScore: 120,
      lastActive: 'today',
      publicRepos: 8
    };
  };

  const coordinator = new SyncCoordinator({
    fetchFn: mockFetcher,
    pacingMs: 0,
    cooldownMs: 0
  });

  const stats = await coordinator.syncAll(repo);

  assert.strictEqual(stats.total, 2);
  assert.strictEqual(stats.updated, 1);
  assert.strictEqual(stats.failed, 1);
  assert.strictEqual(stats.errors.length, 1);
  assert.strictEqual(stats.errors[0].username, 'alice');
  assert.ok(stats.errors[0].error.includes('404'));

  // Bob must still be updated despite Alice failing
  const bob = repo.getStudentByUsername('bob');
  assert.strictEqual(bob?.commits, 90);
  assert.strictEqual(bob?.totalScore, 120);

  // Alice retains previous DB metrics without corruption
  const alice = repo.getStudentByUsername('alice');
  assert.strictEqual(alice?.commits, 10);
});

test('Sync Engine: mutex lock prevents overlapping concurrent sync executions', async () => {
  const repo = createTestRepo();

  let isPaused = true;
  let unpause: () => void;
  const pausePromise = new Promise<void>((resolve) => {
    unpause = () => {
      isPaused = false;
      resolve();
    };
  });

  const slowFetcher = async (): Promise<GitHubUserData> => {
    if (isPaused) {
      await pausePromise;
    }
    return {
      username: 'mock',
      name: 'Mock',
      avatarUrl: '',
      githubUrl: '',
      commits: 1,
      streakDays: 1,
      totalScore: 6,
      lastActive: 'now',
      publicRepos: 1
    };
  };

  const coordinator = new SyncCoordinator({
    fetchFn: slowFetcher,
    pacingMs: 0,
    cooldownMs: 0
  });

  // Start first sync in background
  const firstSyncPromise = coordinator.syncAll(repo);

  // Second concurrent sync attempt must throw SyncConflictError
  await assert.rejects(
    async () => {
      await coordinator.syncAll(repo);
    },
    (err: unknown) => {
      assert.ok(err instanceof SyncConflictError);
      return true;
    }
  );

  // Unpause all iterations so first sync can complete
  unpause!();
  await firstSyncPromise;

  assert.strictEqual(coordinator.isSyncing, false);
});

test('Sync Engine: manual sync enforces cooldown window (debounce protection)', async () => {
  const repo = createTestRepo();

  const mockFetcher = async (username: string): Promise<GitHubUserData> => ({
    username,
    name: username,
    avatarUrl: '',
    githubUrl: '',
    commits: 5,
    streakDays: 1,
    totalScore: 10,
    lastActive: 'now',
    publicRepos: 1
  });

  const coordinator = new SyncCoordinator({
    fetchFn: mockFetcher,
    pacingMs: 0,
    cooldownMs: 60000 // 60s cooldown
  });

  // First manual sync succeeds
  await coordinator.syncAll(repo, { isManual: true });

  // Immediate second manual sync must be rejected with SyncCooldownError
  await assert.rejects(
    async () => {
      await coordinator.syncAll(repo, { isManual: true });
    },
    (err: unknown) => {
      assert.ok(err instanceof SyncCooldownError);
      assert.ok((err as SyncCooldownError).remainingSeconds > 0);
      return true;
    }
  );

  // Non-manual background sync ignores manual cooldown
  const bgStats = await coordinator.syncAll(repo, { isManual: false });
  assert.strictEqual(bgStats.total, 2);
});
