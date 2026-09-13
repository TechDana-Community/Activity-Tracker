export interface GitHubUserData {
  username: string;
  name: string;
  avatarUrl: string;
  githubUrl: string;
  commits: number;
  streakDays: number;
  lastActive: string;
  bio?: string;
  publicRepos: number;
}

/**
 * Calculates the Total Score to prevent gaming with empty commits:
 * Total Score = (Total Commits * 1) + (Active Streak Days * 5)
 */
export function calculateTotalScore(commits: number, streakDays: number): number {
  const safeCommits = Math.max(0, commits || 0);
  const safeStreak = Math.max(0, streakDays || 0);
  return (safeCommits * 1) + (safeStreak * 5);
}

/**
 * Extracts a clean GitHub username from various input formats:
 * - https://github.com/Hosein-Ghojavand
 * - http://github.com/Hosein-Ghojavand/
 * - github.com/Hosein-Ghojavand
 * - @Hosein-Ghojavand
 * - Hosein-Ghojavand
 */
export function extractGitHubUsername(input: string): string {
  let clean = input.trim();
  if (clean.startsWith('@')) {
    clean = clean.substring(1);
  }
  clean = clean.replace(/^https?:\/\//i, '');
  clean = clean.replace(/^www\./i, '');
  clean = clean.replace(/^github\.com\//i, '');
  // Take first segment before slash, query string, or hash
  clean = clean.split('/')[0].split('?')[0].split('#')[0];
  return clean.trim();
}

/**
 * Calculate consecutive active day streak from a list of ISO date strings.
 */
function calculateStreakDays(dateStrings: string[]): number {
  if (dateStrings.length === 0) return 0;

  // Convert to unique date set (YYYY-MM-DD in UTC)
  const uniqueDates = Array.from(
    new Set(
      dateStrings.map((d) => {
        const date = new Date(d);
        return date.toISOString().split('T')[0];
      })
    )
  ).sort().reverse(); // Most recent first

  if (uniqueDates.length === 0) return 0;

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date();
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  const mostRecentDateStr = uniqueDates[0];

  // If the most recent active date is neither today nor yesterday, the streak is broken
  if (mostRecentDateStr !== todayStr && mostRecentDateStr !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  // Start checking from the most recent date
  let expectedDate = new Date(mostRecentDateStr + 'T00:00:00Z');

  for (const dateStr of uniqueDates) {
    const currentDate = new Date(dateStr + 'T00:00:00Z');
    const diffDays = Math.round(
      (expectedDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      streak += 1;
      // Expect the previous calendar day
      expectedDate = new Date(currentDate);
      expectedDate.setUTCDate(expectedDate.getUTCDate() - 1);
    } else {
      // Streak interrupted
      break;
    }
  }

  return streak;
}

/**
 * Formats relative time description for last activity
 */
function formatLastActive(mostRecentDateStr?: string, isRtl = true): string {
  if (!mostRecentDateStr) {
    return isRtl ? 'بدون فعالیت اخیر' : 'No recent activity';
  }

  const now = new Date();
  const activeDate = new Date(mostRecentDateStr);
  const diffMs = now.getTime() - activeDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    return isRtl ? 'لحظاتی پیش' : 'Just now';
  }
  if (diffHours < 24) {
    return isRtl ? `${diffHours} ساعت پیش` : `${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return isRtl ? 'دیروز' : 'Yesterday';
  }
  if (diffDays < 7) {
    return isRtl ? `${diffDays} روز پیش` : `${diffDays} days ago`;
  }
  return isRtl ? `${Math.floor(diffDays / 7)} هفته پیش` : `${Math.floor(diffDays / 7)} weeks ago`;
}

/**
 * Fetches real public GitHub profile and events data for a given username
 */
export async function fetchGitHubStudentData(
  rawInput: string,
  isRtl = true
): Promise<GitHubUserData> {
  const username = extractGitHubUsername(rawInput);
  if (!username) {
    throw new Error(
      isRtl
        ? 'نام کاربری یا لینک گیت‌هاب معتبر وارد نشده است.'
        : 'Invalid GitHub username or profile link.'
    );
  }

  // 1. Fetch user profile
  const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: {
      Accept: 'application/vnd.github.v3+json'
    }
  });

  if (userRes.status === 404) {
    throw new Error(
      isRtl
        ? `کاربری با نام «${username}» در گیت‌هاب پیدا نشد.`
        : `GitHub user "${username}" was not found.`
    );
  }

  if (userRes.status === 403) {
    throw new Error(
      isRtl
        ? 'محدودیت موقت درخواست از گیت‌هاب (Rate Limit) رخ داد. لطفاً چند دقیقه بعد مجدداً تلاش نمایید.'
        : 'GitHub API rate limit exceeded. Please wait a few minutes and try again.'
    );
  }

  if (!userRes.ok) {
    throw new Error(
      isRtl
        ? `خطا در دریافت اطلاعات از گیت‌هاب (کد وضعیت: ${userRes.status})`
        : `Failed to fetch GitHub profile (Status: ${userRes.status})`
    );
  }

  const profile = await userRes.json();

  // 2. Fetch public events to calculate real commits and active streak
  let commitsCount = 0;
  const pushDateStrings: string[] = [];
  let latestEventDate: string | undefined;

  try {
    const eventsRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );

    if (eventsRes.ok) {
      const events = await eventsRes.json();
      if (Array.isArray(events)) {
        for (const ev of events) {
          if (!latestEventDate && ev.created_at) {
            latestEventDate = ev.created_at;
          }

          if (ev.type === 'PushEvent') {
            const pushCommits = ev.payload?.commits;
            const commitBatchCount = Array.isArray(pushCommits)
              ? pushCommits.length
              : typeof ev.payload?.size === 'number'
              ? ev.payload.size
              : 1;

            commitsCount += commitBatchCount;

            if (ev.created_at) {
              pushDateStrings.push(ev.created_at);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch events, continuing with base profile', err);
  }

  // Calculate consecutive active streak days from push events
  const streakDays = calculateStreakDays(pushDateStrings);
  const lastActive = formatLastActive(pushDateStrings[0] || latestEventDate, isRtl);

  return {
    username: profile.login || username,
    name: profile.name?.trim() || profile.login || username,
    avatarUrl: profile.avatar_url || `https://github.com/${username}.png`,
    githubUrl: profile.html_url || `https://github.com/${username}`,
    commits: commitsCount,
    streakDays,
    lastActive,
    bio: profile.bio || undefined,
    publicRepos: profile.public_repos || 0
  };
}
