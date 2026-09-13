import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createDatabase, initSchema, seedInitialStudents, seedInitialStudentsOnce, StudentRepository } from '../db';
import { Student } from '../../src/types';

const mockStudents: Student[] = [
  {
    id: 's-1',
    name: 'Alice Dev',
    username: 'alice',
    githubUrl: 'https://github.com/alice',
    avatarUrl: 'https://github.com/alice.png',
    commits: 50,
    streakDays: 10,
    lastActive: 'today'
  },
  {
    id: 's-2',
    name: 'Bob Coder',
    username: 'bob',
    githubUrl: 'https://github.com/bob',
    avatarUrl: 'https://github.com/bob.png',
    commits: 200,
    streakDays: 2,
    lastActive: 'yesterday'
  }
];

test('Database: schema creation and initial seeding', () => {
  const db = new DatabaseSync(':memory:');
  initSchema(db);

  // Table should exist and be empty
  const repo = new StudentRepository(db);
  assert.strictEqual(repo.getAllStudents().length, 0);

  // Seed students
  seedInitialStudents(db, mockStudents);
  const students = repo.getAllStudents();
  assert.strictEqual(students.length, 2);

  // Re-seeding when not empty should not duplicate
  seedInitialStudents(db, mockStudents);
  assert.strictEqual(repo.getAllStudents().length, 2);
});

test('Database: ordering by total_score descending', () => {
  const db = new DatabaseSync(':memory:');
  initSchema(db);
  seedInitialStudents(db, mockStudents);
  const repo = new StudentRepository(db);

  const students = repo.getAllStudents();
  // Bob: 200 + 2*5 = 210
  // Alice: 50 + 10*5 = 100
  assert.strictEqual(students[0].username, 'bob');
  assert.strictEqual(students[0].totalScore, 210);
  assert.strictEqual(students[1].username, 'alice');
  assert.strictEqual(students[1].totalScore, 100);
});

test('Database: get student by username (case-insensitive)', () => {
  const db = new DatabaseSync(':memory:');
  initSchema(db);
  seedInitialStudents(db, mockStudents);
  const repo = new StudentRepository(db);

  const found = repo.getStudentByUsername('ALICE');
  assert.ok(found);
  assert.strictEqual(found?.username, 'alice');

  const notFound = repo.getStudentByUsername('charlie');
  assert.strictEqual(notFound, null);
});

test('Database: upsert student', () => {
  const db = new DatabaseSync(':memory:');
  initSchema(db);
  const repo = new StudentRepository(db);

  // Insert new
  const newStudent = repo.upsertStudent({
    id: 's-3',
    name: 'Charlie',
    username: 'charlie',
    githubUrl: 'https://github.com/charlie',
    avatarUrl: 'https://github.com/charlie.png',
    commits: 80,
    streakDays: 4,
    lastActive: 'today'
  });

  assert.strictEqual(newStudent.username, 'charlie');
  assert.strictEqual(newStudent.totalScore, 80 + 4 * 5); // 100
  assert.strictEqual(repo.getAllStudents().length, 1);

  // Update existing
  const updated = repo.upsertStudent({
    id: 's-3',
    name: 'Charlie Updated',
    username: 'charlie',
    githubUrl: 'https://github.com/charlie',
    avatarUrl: 'https://github.com/charlie.png',
    commits: 120,
    streakDays: 5,
    lastActive: 'today'
  });

  assert.strictEqual(updated.name, 'Charlie Updated');
  assert.strictEqual(updated.commits, 120);
  assert.strictEqual(updated.totalScore, 120 + 5 * 5); // 145
  assert.strictEqual(repo.getAllStudents().length, 1);
});

test('Database: delete student', () => {
  const db = new DatabaseSync(':memory:');
  initSchema(db);
  seedInitialStudents(db, mockStudents);
  const repo = new StudentRepository(db);

  assert.strictEqual(repo.getAllStudents().length, 2);

  // Delete student
  const deleted = repo.deleteStudent('s-1');
  assert.strictEqual(deleted, true);
  assert.strictEqual(repo.getAllStudents().length, 1);

  // Delete non-existent
  const deleteFake = repo.deleteStudent('fake-id');
  assert.strictEqual(deleteFake, false);
});

test('Database: seedInitialStudentsOnce seeds exactly once in lifetime and does not restore deleted data', () => {
  const db = new DatabaseSync(':memory:');
  initSchema(db);
  const repo = new StudentRepository(db);

  // 1. First run: should seed
  const seeded = seedInitialStudentsOnce(db, mockStudents);
  assert.strictEqual(seeded, true);
  assert.strictEqual(repo.getAllStudents().length, 2);

  // 2. User deletes all students (making table count 0)
  repo.deleteStudent('s-1');
  repo.deleteStudent('s-2');
  assert.strictEqual(repo.getAllStudents().length, 0);

  // 3. Subsequent server restart / call to seedInitialStudentsOnce
  const reseeded = seedInitialStudentsOnce(db, mockStudents);
  assert.strictEqual(reseeded, false); // Must NOT re-seed!
  assert.strictEqual(repo.getAllStudents().length, 0); // Must stay empty!

  // 4. Verify system_config flag
  const checkStmt = db.prepare("SELECT value FROM system_config WHERE key = 'has_seeded'");
  const config = checkStmt.get() as { value: string };
  assert.strictEqual(config?.value, 'true');
});
