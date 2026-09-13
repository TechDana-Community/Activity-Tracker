import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { createDatabase, StudentRepository, seedInitialStudentsOnce } from './server/db';
import { fetchGitHubStudentData } from './server/services/github';
import { SyncCoordinator, SyncConflictError, SyncCooldownError } from './server/services/sync';
import { startBackgroundSync } from './server/services/scheduler';
import { INITIAL_STUDENTS } from './src/data/initialStudents';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Initialize SQLite database with strict test isolation
const isTest =
  process.env.NODE_ENV === 'test' ||
  process.env.npm_lifecycle_event === 'test' ||
  process.argv.some((arg) => arg.includes('--test'));
const defaultDbPath = path.join(process.cwd(), 'data', 'leaderboard.db');
const dbPath = isTest ? ':memory:' : (process.env.DB_PATH || defaultDbPath);
const db = createDatabase(dbPath);
seedInitialStudentsOnce(db, INITIAL_STUDENTS);
const studentRepo = new StudentRepository(db);
const syncCoordinator = new SyncCoordinator();

app.use(express.json());

/**
 * Middleware: Enforces admin authentication via Bearer token
 * Validates against ADMIN_SECRET_KEY env variable (default: 'techdana2026')
 */
export function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const adminKey = process.env.ADMIN_SECRET_KEY || 'techdana2026';

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication required' });
  }

  const token = authHeader.slice(7).trim();
  if (token !== adminKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin credentials' });
  }

  next();
}

// 1. Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'TechDana Coders Club Leaderboard',
    version: '1.1.0',
    hasGitHubToken: Boolean(process.env.GITHUB_TOKEN?.trim()),
    timestamp: new Date().toISOString()
  });
});

// Admin PIN verification endpoint
app.post('/api/admin/verify', (req, res) => {
  const adminKey = process.env.ADMIN_SECRET_KEY || 'techdana2026';
  const { pin } = req.body || {};
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  const providedPin = (pin && typeof pin === 'string' ? pin.trim() : null) || token;

  if (providedPin && providedPin === adminKey) {
    return res.json({ valid: true });
  }
  return res.status(401).json({ error: 'Invalid admin PIN' });
});

// 2. Leaderboard: Retrieve all ranked students
app.get('/api/leaderboard', (req, res) => {
  try {
    const students = studentRepo.getAllStudents();
    res.json(students);
  } catch (err: unknown) {
    console.error('[API] Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Failed to retrieve leaderboard data' });
  }
});

// 3. GitHub Proxy Lookup: Inspect live GitHub metrics without saving
app.post('/api/students/lookup', requireAdminAuth, async (req, res) => {
  const { input, isRtl } = req.body || {};

  if (!input || typeof input !== 'string' || !input.trim()) {
    return res.status(400).json({ error: 'Missing or empty input handle or URL' });
  }

  try {
    const data = await fetchGitHubStudentData(input, isRtl !== false);
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch from GitHub';
    res.status(400).json({ error: message });
  }
});

// 4. Register or Update a Student in the database
app.post('/api/students', requireAdminAuth, async (req, res) => {
  const { username, name, githubUrl, avatarUrl, commits, streakDays, lastActive, bio, publicRepos } = req.body || {};

  if (!username || typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'GitHub username is required' });
  }

  try {
    // If client supplied verified metrics, save directly; otherwise fetch live from GitHub
    let studentData = {
      username: username.trim(),
      name: name?.trim() || username.trim(),
      githubUrl: githubUrl || `https://github.com/${username.trim()}`,
      avatarUrl: avatarUrl || `https://github.com/${username.trim()}.png`,
      commits: typeof commits === 'number' ? commits : 0,
      streakDays: typeof streakDays === 'number' ? streakDays : 0,
      lastActive: lastActive || undefined,
      bio: bio || undefined,
      publicRepos: typeof publicRepos === 'number' ? publicRepos : 0
    };

    if (commits === undefined || streakDays === undefined) {
      const live = await fetchGitHubStudentData(username);
      studentData = {
        ...studentData,
        name: name?.trim() || live.name,
        avatarUrl: live.avatarUrl,
        githubUrl: live.githubUrl,
        commits: live.commits,
        streakDays: live.streakDays,
        lastActive: live.lastActive,
        bio: live.bio,
        publicRepos: live.publicRepos
      };
    }

    const saved = studentRepo.upsertStudent(studentData);
    res.status(201).json(saved);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save student';
    console.error('[API] Error saving student:', err);
    res.status(400).json({ error: message });
  }
});

// 5. Delete Student from database
app.delete('/api/students/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Student ID is required' });
  }

  try {
    const deleted = studentRepo.deleteStudent(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ success: true });
  } catch (err: unknown) {
    console.error('[API] Error deleting student:', err);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// 6. Manual Sync All Members (with Mutex and Cooldown Protection)
app.post('/api/students/sync-all', requireAdminAuth, async (req, res) => {
  try {
    const stats = await syncCoordinator.syncAll(studentRepo, { isManual: true });
    res.json({
      success: true,
      message: `Successfully synchronized ${stats.updated} members (${stats.failed} failed)`,
      stats
    });
  } catch (err: unknown) {
    if (err instanceof SyncConflictError) {
      return res.status(409).json({ error: err.message });
    }
    if (err instanceof SyncCooldownError) {
      return res.status(429).json({
        error: err.message,
        remainingSeconds: err.remainingSeconds
      });
    }
    const message = err instanceof Error ? err.message : 'Synchronization failed';
    console.error('[API] Error during manual sync:', err);
    res.status(500).json({ error: message });
  }
});

// 8. Sync Status & Telemetry
app.get('/api/students/sync-status', (req, res) => {
  res.json(syncCoordinator.getStatus());
});

async function start() {
  // Start periodic hourly background sync worker
  startBackgroundSync(studentRepo, syncCoordinator);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TechDana Leaderboard] Server listening on http://0.0.0.0:${PORT}`);
  });
}

// Start only if run directly as main script (prevents port conflicts during tests)
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('server.ts') || 
  process.argv[1].endsWith('server.cjs') || 
  process.argv[1].endsWith('server.js')
);

if (isDirectRun && process.env.NODE_ENV !== 'test') {
  start();
}

export { app, studentRepo, syncCoordinator };
