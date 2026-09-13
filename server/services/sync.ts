import { StudentRepository } from '../db';
import { fetchGitHubStudentData, GitHubUserData } from './github';

export interface SyncError {
  username: string;
  error: string;
}

export interface SyncStats {
  total: number;
  updated: number;
  failed: number;
  durationMs: number;
  errors: SyncError[];
  timestamp: string;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: string | null;
  lastSyncStats: SyncStats | null;
  cooldownRemainingSeconds: number;
}

export class SyncConflictError extends Error {
  constructor(message = 'A synchronization cycle is already in progress.') {
    super(message);
    this.name = 'SyncConflictError';
  }
}

export class SyncCooldownError extends Error {
  public remainingSeconds: number;
  constructor(remainingSeconds: number) {
    super(`Manual sync cooldown active. Please wait ${remainingSeconds} second(s) before syncing again.`);
    this.name = 'SyncCooldownError';
    this.remainingSeconds = remainingSeconds;
  }
}

export interface SyncCoordinatorOptions {
  fetchFn?: (username: string, isRtl?: boolean) => Promise<GitHubUserData>;
  cooldownMs?: number;
  pacingMs?: number;
}

/**
 * Coordinates automated and manual student synchronization cycles with mutex locking,
 * rate-limit cooldown, and fault isolation.
 */
export class SyncCoordinator {
  public isSyncing = false;
  public lastSyncTime: string | null = null;
  public lastSyncStats: SyncStats | null = null;
  private lastManualSyncTimestamp: number | null = null;

  private fetchFn: (username: string, isRtl?: boolean) => Promise<GitHubUserData>;
  private cooldownMs: number;
  private pacingMs: number;

  constructor(options: SyncCoordinatorOptions = {}) {
    this.fetchFn = options.fetchFn || fetchGitHubStudentData;
    this.cooldownMs = options.cooldownMs !== undefined ? options.cooldownMs : 60000; // 60s
    this.pacingMs = options.pacingMs !== undefined ? options.pacingMs : 200; // 200ms
  }

  /**
   * Returns current sync telemetry and lock status
   */
  getStatus(): SyncStatus {
    const now = Date.now();
    let cooldownRemainingSeconds = 0;
    if (this.lastManualSyncTimestamp && this.cooldownMs > 0) {
      const elapsed = now - this.lastManualSyncTimestamp;
      if (elapsed < this.cooldownMs) {
        cooldownRemainingSeconds = Math.ceil((this.cooldownMs - elapsed) / 1000);
      }
    }

    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      lastSyncStats: this.lastSyncStats,
      cooldownRemainingSeconds
    };
  }

  /**
   * Synchronizes all students in the database with live GitHub metrics.
   * Isolates failures so that one member's error does not abort the entire cohort.
   */
  async syncAll(
    repo: StudentRepository,
    options: { isManual?: boolean } = {}
  ): Promise<SyncStats> {
    // 1. Mutex Check: Prevent concurrent overlapping sync runs
    if (this.isSyncing) {
      throw new SyncConflictError();
    }

    // 2. Cooldown Check (Manual triggers only)
    const now = Date.now();
    if (options.isManual && this.lastManualSyncTimestamp && this.cooldownMs > 0) {
      const elapsed = now - this.lastManualSyncTimestamp;
      if (elapsed < this.cooldownMs) {
        const remainingSeconds = Math.ceil((this.cooldownMs - elapsed) / 1000);
        throw new SyncCooldownError(remainingSeconds);
      }
    }

    this.isSyncing = true;
    const startTime = Date.now();
    const students = repo.getAllStudents();
    const errors: SyncError[] = [];
    let updatedCount = 0;
    let failedCount = 0;

    try {
      for (let i = 0; i < students.length; i++) {
        const student = students[i];

        try {
          // Fetch live GitHub metrics using server token proxy
          const liveData = await this.fetchFn(student.username, true);

          // Update student in SQLite persistence
          repo.upsertStudent({
            ...student,
            name: student.name || liveData.name,
            avatarUrl: liveData.avatarUrl,
            githubUrl: liveData.githubUrl,
            commits: liveData.commits,
            streakDays: liveData.streakDays,
            lastActive: liveData.lastActive,
            bio: liveData.bio || student.bio,
            publicRepos: liveData.publicRepos
          });

          updatedCount++;
        } catch (err: unknown) {
          // Fault Isolation: capture individual error and proceed
          failedCount++;
          const message = err instanceof Error ? err.message : String(err);
          errors.push({ username: student.username, error: message });
          console.warn(`[Sync Coordinator] Failed to sync @${student.username}: ${message}`);
        }

        // Polite pacing between GitHub API calls to avoid secondary rate limits
        if (this.pacingMs > 0 && i < students.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, this.pacingMs));
        }
      }

      const durationMs = Date.now() - startTime;
      const stats: SyncStats = {
        total: students.length,
        updated: updatedCount,
        failed: failedCount,
        durationMs,
        errors,
        timestamp: new Date().toISOString()
      };

      this.lastSyncTime = stats.timestamp;
      this.lastSyncStats = stats;
      if (options.isManual) {
        this.lastManualSyncTimestamp = Date.now();
      }

      return stats;
    } finally {
      this.isSyncing = false;
    }
  }
}
