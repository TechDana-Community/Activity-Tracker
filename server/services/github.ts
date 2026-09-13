export interface GitHubUserData {
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

export interface ContributionDay {
  date: string;
  contributionCount: number;
}

const GRAPHQL_QUERY = `
query GetUserContributions($username: String!) {
  user(login: $username) {
    name
    login
    avatarUrl
    url
    bio
    repositories {
      totalCount
    }
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}
`;

/**
 * Calculates the Total Score to prevent gaming with empty commits:
 * Total Score = (Total Commits/Contributions * 1) + (Active Streak Days * 5)
 */
export function calculateTotalScore(commits: number, streakDays: number): number {
  const safeCommits = Math.max(0, commits || 0);
  const safeStreak = Math.max(0, streakDays || 0);
  return safeCommits * 1 + safeStreak * 5;
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
  clean = clean.split('/')[0].split('?')[0].split('#')[0];
  return clean.trim();
}

/**
 * Calculates consecutive active day streak from GitHub GraphQL 365-day contribution calendar.
 * Considers streaks active if committed today OR maintained from yesterday.
 */
export function calculateCalendarStreakDays(
  calendarDays: Array<{ date: string; contributionCount: number }>
): number {
  if (!calendarDays || calendarDays.length === 0) return 0;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterdayDate = new Date(now);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  // Filter out any future dates and sort chronologically ascending
  const sorted = [...calendarDays]
    .filter((d) => d.date <= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) return 0;

  const lastDay = sorted[sorted.length - 1];
  let startIndex = -1;

  if (lastDay.date === todayStr) {
    if (lastDay.contributionCount > 0) {
      startIndex = sorted.length - 1;
    } else if (sorted.length > 1 && sorted[sorted.length - 2].date === yesterdayStr) {
      if (sorted[sorted.length - 2].contributionCount > 0) {
        startIndex = sorted.length - 2;
      } else {
        return 0; // Both today and yesterday have zero contributions
      }
    } else {
      return 0;
    }
  } else if (lastDay.date === yesterdayStr) {
    if (lastDay.contributionCount > 0) {
      startIndex = sorted.length - 1;
    } else {
      return 0;
    }
  } else {
    // Last recorded day is older than yesterday, streak is broken
    return 0;
  }

  let streak = 0;
  let expectedDate = new Date(sorted[startIndex].date + 'T00:00:00Z');

  for (let i = startIndex; i >= 0; i--) {
    const currentDay = sorted[i];
    const currentDate = new Date(currentDay.date + 'T00:00:00Z');

    const diffDays = Math.round(
      (expectedDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0 && currentDay.contributionCount > 0) {
      streak += 1;
      expectedDate = new Date(currentDate);
      expectedDate.setUTCDate(expectedDate.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Fallback streak calculation from REST event timestamps
 */
export function calculateStreakDays(dateStrings: string[]): number {
  if (dateStrings.length === 0) return 0;

  const uniqueDates = Array.from(
    new Set(
      dateStrings.map((d) => {
        const date = new Date(d);
        return date.toISOString().split('T')[0];
      })
    )
  ).sort().reverse();

  if (uniqueDates.length === 0) return 0;

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date();
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  const mostRecentDateStr = uniqueDates[0];

  if (mostRecentDateStr !== todayStr && mostRecentDateStr !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  let expectedDate = new Date(mostRecentDateStr + 'T00:00:00Z');

  for (const dateStr of uniqueDates) {
    const currentDate = new Date(dateStr + 'T00:00:00Z');
    const diffDays = Math.round(
      (expectedDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      streak += 1;
      expectedDate = new Date(currentDate);
      expectedDate.setUTCDate(expectedDate.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Formats relative time description for last activity
 */
export function formatLastActive(mostRecentDateStr?: string, isRtl = true): string {
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
 * Fetches 365-day verified contributions and calendar via GitHub GraphQL API
 */
export async function fetchGraphQLContributions(
  username: string,
  token: string,
  isRtl = true
): Promise<GitHubUserData> {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'TechDana-Community-Dashboard',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      query: GRAPHQL_QUERY,
      variables: { username }
    })
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL HTTP ${response.status}: ${response.statusText}`);
  }

  const body = await response.json();

  if (body.errors && body.errors.length > 0) {
    const isNotFound = body.errors.some(
      (e: { type?: string }) => e.type === 'NOT_FOUND'
    );
    if (isNotFound) {
      throw new Error(
        isRtl
          ? `کاربری با نام «${username}» در گیت‌هاب پیدا نشد.`
          : `GitHub user "${username}" was not found.`
      );
    }
    throw new Error(body.errors[0].message || 'GraphQL Query Error');
  }

  const user = body.data?.user;
  if (!user) {
    throw new Error(
      isRtl
        ? `کاربری با نام «${username}» در گیت‌هاب پیدا نشد.`
        : `GitHub user "${username}" was not found.`
    );
  }

  const calendar = user.contributionsCollection?.contributionCalendar;
  const totalContributions = calendar?.totalContributions ?? 0;

  const calendarDays: ContributionDay[] = [];
  if (calendar?.weeks) {
    for (const week of calendar.weeks) {
      if (week.contributionDays) {
        for (const day of week.contributionDays) {
          calendarDays.push({
            date: day.date,
            contributionCount: day.contributionCount
          });
        }
      }
    }
  }

  const streakDays = calculateCalendarStreakDays(calendarDays);

  // Find most recent active date in the calendar
  const activeDays = calendarDays.filter((d) => d.contributionCount > 0);
  const mostRecentDateStr = activeDays.length > 0 ? activeDays[activeDays.length - 1].date : undefined;
  const lastActive = formatLastActive(mostRecentDateStr, isRtl);
  const totalScore = calculateTotalScore(totalContributions, streakDays);

  return {
    username: user.login || username,
    name: user.name?.trim() || user.login || username,
    avatarUrl: user.avatarUrl || `https://github.com/${username}.png`,
    githubUrl: user.url || `https://github.com/${username}`,
    commits: totalContributions,
    streakDays,
    totalScore,
    lastActive,
    bio: user.bio || undefined,
    publicRepos: user.repositories?.totalCount || 0
  };
}

/**
 * Fallback REST fetcher when GITHUB_TOKEN is omitted or GraphQL query fails
 */
async function fetchRestStudentData(
  username: string,
  token?: string,
  isRtl = true
): Promise<GitHubUserData> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'TechDana-Community-Dashboard'
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers
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
        ? 'محدودیت موقت درخواست از گیت‌هاب رخ داد. لطفاً توکن معتبر گیت‌هاب در تنظیمات سرور ثبت فرمایید.'
        : 'GitHub API rate limit exceeded. Please ensure a valid GITHUB_TOKEN is set in server environment.'
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

  let commitsCount = 0;
  const pushDateStrings: string[] = [];
  let latestEventDate: string | undefined;

  try {
    const eventsRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100`,
      { headers }
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
    console.warn('[GitHub Service] Could not fetch public events, proceeding with base profile:', err);
  }

  const streakDays = calculateStreakDays(pushDateStrings);
  const lastActive = formatLastActive(pushDateStrings[0] || latestEventDate, isRtl);
  const totalScore = calculateTotalScore(commitsCount, streakDays);

  return {
    username: profile.login || username,
    name: profile.name?.trim() || profile.login || username,
    avatarUrl: profile.avatar_url || `https://github.com/${username}.png`,
    githubUrl: profile.html_url || `https://github.com/${username}`,
    commits: commitsCount,
    streakDays,
    totalScore,
    lastActive,
    bio: profile.bio || undefined,
    publicRepos: profile.public_repos || 0
  };
}

/**
 * Main ingestion entry point: Uses GraphQL when GITHUB_TOKEN is available,
 * falling back gracefully to REST for local development without token.
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

  const token = process.env.GITHUB_TOKEN?.trim();

  if (token) {
    try {
      return await fetchGraphQLContributions(username, token, isRtl);
    } catch (err: unknown) {
      console.warn(`[GitHub Service] GraphQL query failed for @${username}, falling back to REST:`, err);
      return await fetchRestStudentData(username, token, isRtl);
    }
  }

  return await fetchRestStudentData(username, undefined, isRtl);
}
