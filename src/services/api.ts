import { Student } from '../types';

export interface GitHubLookupResult {
  username: string;
  name: string;
  avatarUrl: string;
  githubUrl: string;
  commits: number;
  streakDays: number;
  totalScore: number;
  lastActive: string;
  bio?: string;
  publicRepos: number;
}

const ADMIN_TOKEN_KEY = 'techdana_admin_token';

/**
 * Retrieve admin auth token from sessionStorage
 */
export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Persist admin auth token in sessionStorage
 */
export function setAdminToken(token: string): void {
  try {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {
    // sessionStorage unavailable or quota exceeded
  }
}

/**
 * Clear admin auth token from sessionStorage
 */
export function clearAdminToken(): void {
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    // ignore
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * REST API client for TechDana Activity Tracker backend
 */
export const api = {
  /**
   * Verify admin PIN with backend
   */
  async verifyAdminPin(pin: string): Promise<boolean> {
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    if (!res.ok) {
      return false;
    }
    const data = await res.json();
    return Boolean(data.valid);
  },

  /**
   * Fetch all ranked students from the backend SQLite database
   */
  async getLeaderboard(): Promise<Student[]> {
    const res = await fetch('/api/leaderboard');
    if (!res.ok) {
      throw new Error(`Failed to load leaderboard (${res.status})`);
    }
    return res.json();
  },

  /**
   * Proxied GitHub lookup (uses server GITHUB_TOKEN to bypass 60 req/hr limit)
   */
  async lookupStudent(input: string, isRtl = true): Promise<GitHubLookupResult> {
    const res = await fetch('/api/students/lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ input, isRtl })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch student from GitHub');
    }
    return data;
  },

  /**
   * Save or update student in the backend SQLite database
   */
  async addStudent(studentData: Omit<Student, 'id'> & { id?: string }): Promise<Student> {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(studentData)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save student');
    }
    return data;
  },

  /**
   * Delete student by ID from the database
   */
  async deleteStudent(id: string): Promise<boolean> {
    const res = await fetch(`/api/students/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to delete student');
    }
    return true;
  },

  /**
   * Trigger manual sync for all cohort members with GitHub metrics
   */
  async syncAllStudents(): Promise<{
    success: boolean;
    message: string;
    stats: {
      total: number;
      updated: number;
      failed: number;
      durationMs: number;
      errors: Array<{ username: string; error: string }>;
    };
  }> {
    const res = await fetch('/api/students/sync-all', {
      method: 'POST',
      headers: getAuthHeaders()
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to synchronize members');
    }
    return data;
  },

  /**
   * Retrieve background sync status & cooldown telemetry
   */
  async getSyncStatus(): Promise<{
    isSyncing: boolean;
    lastSyncTime: string | null;
    cooldownRemainingSeconds: number;
  }> {
    const res = await fetch('/api/students/sync-status');
    if (!res.ok) {
      throw new Error('Failed to retrieve sync status');
    }
    return res.json();
  }
};
