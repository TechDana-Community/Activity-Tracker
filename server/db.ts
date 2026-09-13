import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { Student } from '../src/types';

export interface DbStudent extends Student {
  totalScore: number;
  bio?: string;
  publicRepos?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Calculates the Total Score based on verified commits and active streak days:
 * Total Score = (Commits * 1) + (Streak Days * 5)
 */
export function calculateTotalScore(commits: number, streakDays: number): number {
  const safeCommits = Math.max(0, commits || 0);
  const safeStreak = Math.max(0, streakDays || 0);
  return safeCommits * 1 + safeStreak * 5;
}

/**
 * Creates or opens a SQLite database.
 * If dbPath is not provided, defaults to ./data/leaderboard.db.
 */
export function createDatabase(dbPath?: string): DatabaseSync {
  if (!dbPath || dbPath === ':memory:') {
    const db = new DatabaseSync(dbPath || ':memory:');
    initSchema(db);
    return db;
  }

  const resolvedPath = path.resolve(dbPath);
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(resolvedPath);
  initSchema(db);
  return db;
}

/**
 * Initializes the database schema with necessary tables and indices.
 */
export function initSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      name TEXT NOT NULL,
      github_url TEXT NOT NULL,
      avatar_url TEXT NOT NULL,
      commits INTEGER NOT NULL DEFAULT 0,
      streak_days INTEGER NOT NULL DEFAULT 0,
      total_score INTEGER NOT NULL DEFAULT 0,
      last_active TEXT,
      bio TEXT,
      public_repos INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_students_total_score 
      ON students (total_score DESC, streak_days DESC, commits DESC);
  `);
}

/**
 * Seeds initial student cohort exactly ONCE in database lifetime.
 * Uses system_config to guarantee that if an admin deletes mock data,
 * the mock data will NEVER reappear on server restart.
 */
export function seedInitialStudentsOnce(db: DatabaseSync, initialStudents: Student[]): boolean {
  const checkStmt = db.prepare("SELECT value FROM system_config WHERE key = 'has_seeded'");
  const row = checkStmt.get() as { value: string } | undefined;

  if (row && row.value === 'true') {
    return false; // Already seeded in this database's lifetime. Never auto-seed again!
  }

  // If database already contains students from a previous session, record has_seeded flag immediately
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM students');
  const countResult = countStmt.get() as { count: number };
  if (countResult && countResult.count > 0) {
    db.prepare("INSERT OR REPLACE INTO system_config (key, value) VALUES ('has_seeded', 'true')").run();
    return false;
  }

  seedInitialStudents(db, initialStudents);
  db.prepare("INSERT OR REPLACE INTO system_config (key, value) VALUES ('has_seeded', 'true')").run();
  return true;
}

/**
 * Seeds initial student cohort if table is currently empty.
 */
export function seedInitialStudents(db: DatabaseSync, initialStudents: Student[]): void {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM students');
  const result = countStmt.get() as { count: number };

  if (result && result.count > 0) {
    return; // Already populated
  }

  const insertStmt = db.prepare(`
    INSERT INTO students (
      id, username, name, github_url, avatar_url,
      commits, streak_days, total_score, last_active, bio, public_repos
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
  `);

  for (const s of initialStudents) {
    const score = calculateTotalScore(s.commits, s.streakDays);
    insertStmt.run(
      s.id,
      s.username,
      s.name,
      s.githubUrl,
      s.avatarUrl,
      s.commits,
      s.streakDays,
      score,
      s.lastActive || null,
      (s as DbStudent).bio || null,
      (s as DbStudent).publicRepos || 0
    );
  }
}

/**
 * Repository class providing clean, typed CRUD operations on the SQLite students table.
 */
export class StudentRepository {
  constructor(private db: DatabaseSync) {}

  getAllStudents(): DbStudent[] {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        username,
        name,
        github_url as githubUrl,
        avatar_url as avatarUrl,
        commits,
        streak_days as streakDays,
        total_score as totalScore,
        last_active as lastActive,
        bio,
        public_repos as publicRepos,
        created_at as createdAt,
        updated_at as updatedAt
      FROM students
      ORDER BY total_score DESC, streak_days DESC, commits DESC
    `);

    return stmt.all() as unknown as DbStudent[];
  }

  getStudentByUsername(username: string): DbStudent | null {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        username,
        name,
        github_url as githubUrl,
        avatar_url as avatarUrl,
        commits,
        streak_days as streakDays,
        total_score as totalScore,
        last_active as lastActive,
        bio,
        public_repos as publicRepos,
        created_at as createdAt,
        updated_at as updatedAt
      FROM students
      WHERE username = ? COLLATE NOCASE
    `);

    const row = stmt.get(username);
    return (row as unknown as DbStudent) || null;
  }

  upsertStudent(student: Omit<Student, 'id'> & { id?: string; bio?: string; publicRepos?: number }): DbStudent {
    const existing = this.getStudentByUsername(student.username);
    const id = student.id || existing?.id || `student-${Date.now()}`;
    const score = calculateTotalScore(student.commits, student.streakDays);

    const stmt = this.db.prepare(`
      INSERT INTO students (
        id, username, name, github_url, avatar_url,
        commits, streak_days, total_score, last_active, bio, public_repos, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, datetime('now')
      )
      ON CONFLICT(username) DO UPDATE SET
        name = excluded.name,
        github_url = excluded.github_url,
        avatar_url = excluded.avatar_url,
        commits = excluded.commits,
        streak_days = excluded.streak_days,
        total_score = excluded.total_score,
        last_active = excluded.last_active,
        bio = excluded.bio,
        public_repos = excluded.public_repos,
        updated_at = datetime('now')
    `);

    stmt.run(
      id,
      student.username,
      student.name,
      student.githubUrl,
      student.avatarUrl,
      student.commits,
      student.streakDays,
      score,
      student.lastActive || null,
      student.bio || null,
      student.publicRepos || 0
    );

    return this.getStudentByUsername(student.username)!;
  }

  deleteStudent(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM students WHERE id = ? OR username = ?');
    const result = stmt.run(id, id);
    return Number(result.changes) > 0;
  }
}

