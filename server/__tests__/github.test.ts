import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTotalScore,
  extractGitHubUsername,
  calculateStreakDays,
  calculateCalendarStreakDays,
  formatLastActive
} from '../services/github';

// Helper to construct calendar days relative to UTC today
function createMockCalendar(countsFromTodayBackwards: number[]): Array<{ date: string; contributionCount: number }> {
  // countsFromTodayBackwards: index 0 is today, index 1 is yesterday, etc.
  const now = new Date();
  const result: Array<{ date: string; contributionCount: number }> = [];
  for (let i = countsFromTodayBackwards.length - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    result.push({
      date: d.toISOString().split('T')[0],
      contributionCount: countsFromTodayBackwards[i]
    });
  }
  return result;
}

test('GitHub Service: calculateTotalScore anti-gaming logic', () => {
  // Score = Commits * 1 + Streak * 5
  assert.strictEqual(calculateTotalScore(10, 2), 20);
  assert.strictEqual(calculateTotalScore(100, 10), 150);
  assert.strictEqual(calculateTotalScore(0, 0), 0);
  // Edge cases: negative numbers clamped to 0
  assert.strictEqual(calculateTotalScore(-5, -2), 0);
});

test('GitHub Service: extractGitHubUsername handles various formats', () => {
  assert.strictEqual(extractGitHubUsername('https://github.com/Hosein-Ghojavand'), 'Hosein-Ghojavand');
  assert.strictEqual(extractGitHubUsername('http://github.com/octocat/'), 'octocat');
  assert.strictEqual(extractGitHubUsername('github.com/torvalds'), 'torvalds');
  assert.strictEqual(extractGitHubUsername('@sara-rezaei'), 'sara-rezaei');
  assert.strictEqual(extractGitHubUsername('ali-karimi'), 'ali-karimi');
  assert.strictEqual(extractGitHubUsername('https://github.com/user?tab=repositories'), 'user');
  assert.strictEqual(extractGitHubUsername('  https://github.com/spaced-user/   '), 'spaced-user');
});

test('GitHub Service: calculateStreakDays detects consecutive active days (REST fallback)', () => {
  const now = new Date();
  const d0 = new Date(now).toISOString();
  
  const d1Date = new Date(now);
  d1Date.setUTCDate(d1Date.getUTCDate() - 1);
  const d1 = d1Date.toISOString();

  const d2Date = new Date(now);
  d2Date.setUTCDate(d2Date.getUTCDate() - 2);
  const d2 = d2Date.toISOString();

  // 3 consecutive days (today, yesterday, 2 days ago)
  assert.strictEqual(calculateStreakDays([d0, d1, d2]), 3);

  // 1 day (today only)
  assert.strictEqual(calculateStreakDays([d0]), 1);

  // Empty list => 0
  assert.strictEqual(calculateStreakDays([]), 0);

  // Broken streak (last active was 5 days ago)
  const oldDate = new Date(now);
  oldDate.setUTCDate(oldDate.getUTCDate() - 5);
  assert.strictEqual(calculateStreakDays([oldDate.toISOString()]), 0);
});

test('GitHub Service (GraphQL): calculateCalendarStreakDays active today', () => {
  // [today: 2, yesterday: 5, 2-days-ago: 1, 3-days-ago: 0]
  const calendar = createMockCalendar([2, 5, 1, 0, 10]);
  assert.strictEqual(calculateCalendarStreakDays(calendar), 3);
});

test('GitHub Service (GraphQL): calculateCalendarStreakDays active yesterday only (unbroken streak)', () => {
  // Today count is 0, but yesterday is 3, 2-days-ago is 2, 3-days-ago is 0
  const calendar = createMockCalendar([0, 3, 2, 0, 4]);
  assert.strictEqual(calculateCalendarStreakDays(calendar), 2);
});

test('GitHub Service (GraphQL): calculateCalendarStreakDays broken streak', () => {
  // Both today and yesterday are 0
  const calendar = createMockCalendar([0, 0, 15, 8, 4]);
  assert.strictEqual(calculateCalendarStreakDays(calendar), 0);
});

test('GitHub Service (GraphQL): calculateCalendarStreakDays 35-day streak', () => {
  // 35 consecutive days with active contributions
  const active35 = Array(35).fill(2);
  active35.push(0); // broken 36 days ago
  active35.push(5);
  const calendar = createMockCalendar(active35);
  assert.strictEqual(calculateCalendarStreakDays(calendar), 35);
});

test('GitHub Service (GraphQL): calculateCalendarStreakDays edge cases (empty or all zero)', () => {
  assert.strictEqual(calculateCalendarStreakDays([]), 0);
  const allZero = createMockCalendar([0, 0, 0, 0]);
  assert.strictEqual(calculateCalendarStreakDays(allZero), 0);
});

test('GitHub Service: formatLastActive returns localized relative time', () => {
  const now = new Date();
  assert.strictEqual(formatLastActive(now.toISOString(), true), 'لحظاتی پیش');
  assert.strictEqual(formatLastActive(now.toISOString(), false), 'Just now');

  assert.strictEqual(formatLastActive(undefined, true), 'بدون فعالیت اخیر');
  assert.strictEqual(formatLastActive(undefined, false), 'No recent activity');
});
