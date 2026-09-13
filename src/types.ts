export interface Student {
  id: string;
  name: string;
  username: string; // GitHub handle
  githubUrl: string;
  avatarUrl: string;
  commits: number;
  streakDays: number;
  totalScore?: number;
  lastActive?: string;
  bio?: string;
  publicRepos?: number;
}

export type ViewMode = 'leaderboard' | 'admin';
export type Language = 'fa' | 'en';
