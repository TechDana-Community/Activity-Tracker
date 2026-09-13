import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Flame,
  GitCommit,
  ExternalLink,
  Search,
  ArrowUpDown,
  Users,
  Zap,
  Award
} from 'lucide-react';
import { Student, Language } from '../types';
import { calculateTotalScore } from '../utils/github';

interface LeaderboardViewProps {
  students: Student[];
  language: Language;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ students, language }) => {
  const isRtl = language === 'fa';
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'commits' | 'streak'>('score');

  // Filter and sort students based on Total Score by default
  const filteredAndSortedStudents = useMemo(() => {
    return [...students]
      .filter((s) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        return (
          s.name.toLowerCase().includes(query) ||
          s.username.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'score') {
          const scoreA = calculateTotalScore(a.commits, a.streakDays);
          const scoreB = calculateTotalScore(b.commits, b.streakDays);
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }
          // Tie-breaker: prioritize consistency (streak), then commits
          if (b.streakDays !== a.streakDays) {
            return b.streakDays - a.streakDays;
          }
          return b.commits - a.commits;
        }
        if (sortBy === 'commits') {
          return b.commits - a.commits;
        }
        return b.streakDays - a.streakDays;
      });
  }, [students, searchQuery, sortBy]);

  // Aggregate stats
  const totalCommits = useMemo(() => {
    return students.reduce((sum, s) => sum + s.commits, 0);
  }, [students]);

  const maxStreak = useMemo(() => {
    return students.reduce((max, s) => Math.max(max, s.streakDays), 0);
  }, [students]);

  const highestScore = useMemo(() => {
    return students.reduce((max, s) => {
      const score = calculateTotalScore(s.commits, s.streakDays);
      return Math.max(max, score);
    }, 0);
  }, [students]);

  return (
    <div className="space-y-6">
      {/* Top Highlight Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-4 hover:border-slate-300 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-[#0D2146]/5 border border-[#0D2146]/10 flex items-center justify-center text-[#0D2146]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isRtl ? 'دانشجویان فعال' : 'Active Students'}
            </p>
            <p className="text-2xl font-black text-[#0D2146]">
              {students.length} {isRtl ? 'نفر' : 'Devs'}
            </p>
          </div>
        </div>

        {/* Highest Score (Total Score Leader) */}
        <div className="bg-white p-5 rounded-2xl border border-orange-200/80 shadow-xs flex items-center gap-4 hover:border-orange-300 transition-all bg-gradient-to-br from-white to-orange-50/30">
          <div className="w-12 h-12 rounded-2xl bg-[#0D2146] border border-[#1A3464] flex items-center justify-center text-[#FF6A00] shadow-xs">
            <Zap className="w-6 h-6 fill-[#FF6A00]" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#FF6A00] uppercase tracking-wider">
              {isRtl ? 'بالاترین امتیاز کسب‌شده' : 'Highest Score'}
            </p>
            <p className="text-2xl font-black text-[#0D2146]">
              {highestScore.toLocaleString()}{' '}
              <span className="text-xs font-bold text-slate-400">
                {isRtl ? 'امتیاز' : 'pts'}
              </span>
            </p>
          </div>
        </div>

        {/* Total Commits */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-4 hover:border-slate-300 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-[#FF6A00]">
            <GitCommit className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isRtl ? 'مجموع کامیت‌ها' : 'Total Commits'}
            </p>
            <p className="text-2xl font-black text-[#0D2146]">
              {totalCommits.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Max Streak */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-4 hover:border-slate-300 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-[#FF6A00]">
            <Flame className="w-6 h-6 fill-[#FF6A00]" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isRtl ? 'بیشترین تداوم متوالی' : 'Longest Streak'}
            </p>
            <p className="text-2xl font-black text-[#0D2146]">
              {maxStreak} {isRtl ? 'روز' : 'Days'}
            </p>
          </div>
        </div>
      </div>

      {/* Anti-Gaming Scoring Formula Notice Banner */}
      <div className="bg-gradient-to-r from-[#0D2146] via-[#102956] to-[#0D2146] text-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#1D3B73]">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-400/40 flex items-center justify-center text-[#FF6A00] flex-shrink-0 shadow-xs">
            <Zap className="w-5 h-5 fill-[#FF6A00]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-black text-white">
                {isRtl
                  ? 'سیستم ارزیابی عادلانه (جلوگیری از کامیت‌های صوری و اسپم)'
                  : 'Fair Evaluation System (Anti-Gaming & Anti-Spam)'}
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6A00] text-white font-bold shadow-2xs">
                {isRtl ? 'ضریب ۵ برابری تداوم روزانه' : '5x Streak Weight'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1 font-medium leading-relaxed">
              {isRtl
                ? 'رتبه‌بندی بر مبنای امتیاز کل انجام می‌شود: امتیاز کل = (مجموع کامیت‌ها × ۱) + (روزهای تداوم پیاپی × ۵). پایداری و تداوم کدنویسی ارزش ۵ برابری دارد.'
                : 'Standings are ordered by Total Score: (Total Commits × 1) + (Active Streak Days × 5). Consistent daily effort is weighted 5x to prevent empty commit gaming.'}
            </p>
          </div>
        </div>

        <div className="self-start sm:self-center px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-xs font-mono font-bold text-orange-200 tracking-wide flex-shrink-0 shadow-inner">
          Score = (Commits × 1) + (Streak × 5)
        </div>
      </div>

      {/* Main Leaderboard Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Table Controls & Search Filter */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-[#0D2146] flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#FF6A00]" />
              <span>
                {isRtl
                  ? 'جدول رتبه‌بندی باشگاه برنامه‌نویسان تک دانا'
                  : 'TechDana Coders Club Standings'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {isRtl
                ? 'مرتب‌شده بر اساس امتیاز کل نهایی (ترکیب مشارکت و تداوم روزانه)'
                : 'Ranked by Total Score (weighted commit volume and active day streak)'}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 sm:flex-initial">
              <Search
                className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                  isRtl ? 'right-3' : 'left-3'
                }`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRtl ? 'جستجوی نام یا آیدی گیت‌هاب...' : 'Search student or @handle...'}
                className={`w-full sm:w-56 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-hidden focus:border-[#FF6A00] focus:ring-2 focus:ring-orange-100 transition-all ${
                  isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'
                }`}
              />
            </div>

            {/* Sort Toggle (Default: Total Score) */}
            <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSortBy('score')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  sortBy === 'score'
                    ? 'bg-[#0D2146] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-[#0D2146]'
                }`}
              >
                <Zap className={`w-3.5 h-3.5 ${sortBy === 'score' ? 'text-[#FF6A00] fill-[#FF6A00]' : 'text-slate-400'}`} />
                <span>{isRtl ? 'امتیاز کل' : 'Total Score'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSortBy('commits')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  sortBy === 'commits'
                    ? 'bg-[#FF6A00] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-[#0D2146]'
                }`}
              >
                {isRtl ? 'کامیت‌ها' : 'Commits'}
              </button>
              <button
                type="button"
                onClick={() => setSortBy('streak')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  sortBy === 'streak'
                    ? 'bg-[#FF6A00] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-[#0D2146]'
                }`}
              >
                {isRtl ? 'تداوم' : 'Streak'}
              </button>
            </div>
          </div>
        </div>

        {/* Bio-link style Table with Prominent Total Score */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-6 w-16 text-center">
                  {isRtl ? 'رتبه' : 'Rank'}
                </th>
                <th className={`py-3.5 px-4 ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl ? 'دانشجو' : 'Student'}
                </th>
                {/* Prominent Total Score Column */}
                <th className="py-3.5 px-6 text-center bg-orange-50/30">
                  <span className="inline-flex items-center gap-1.5 text-[#0D2146] font-black">
                    <Zap className="w-3.5 h-3.5 text-[#FF6A00] fill-[#FF6A00]" />
                    <span>{isRtl ? 'امتیاز کل' : 'Total Score'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>
                <th className="py-3.5 px-6 text-center">
                  <span>{isRtl ? 'کامیت‌ها' : 'Commits'}</span>
                </th>
                <th className="py-3.5 px-6 text-center">
                  <span>{isRtl ? 'تداوم روزانه' : 'Streak'}</span>
                </th>
                <th className={`py-3.5 px-6 ${isRtl ? 'text-left' : 'text-right'}`}>
                  {isRtl ? 'پروفایل گیت‌هاب' : 'GitHub'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400 font-medium">
                    {isRtl
                      ? `هیچ نتیجه‌ای مطابق با «${searchQuery}» یافت نشد.`
                      : `No students match "${searchQuery}".`}
                  </td>
                </tr>
              ) : (
                filteredAndSortedStudents.map((student, idx) => {
                  const rank = idx + 1;
                  const isGold = rank === 1;
                  const isSilver = rank === 2;
                  const isBronze = rank === 3;
                  const totalScore = calculateTotalScore(student.commits, student.streakDays);

                  return (
                    <tr
                      key={student.id || student.username}
                      className="hover:bg-orange-50/20 transition-colors group"
                    >
                      {/* Rank Indicator */}
                      <td className="py-4 px-6 text-center font-bold">
                        {isGold && (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-[#FF6A00] text-white text-xs font-black shadow-sm">
                            1
                          </span>
                        )}
                        {isSilver && (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-200 text-slate-700 text-xs font-black">
                            2
                          </span>
                        )}
                        {isBronze && (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-orange-100 text-[#EA580C] text-xs font-black">
                            3
                          </span>
                        )}
                        {!isGold && !isSilver && !isBronze && (
                          <span className="text-slate-400 text-xs font-bold">#{rank}</span>
                        )}
                      </td>

                      {/* Student Profile & Handle */}
                      <td className={`py-4 px-4 ${isRtl ? 'text-right' : 'text-left'}`}>
                        <div className="flex items-center gap-3">
                          <img
                            src={student.avatarUrl}
                            alt={student.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                student.name || student.username
                              )}&background=0D2146&color=fff`;
                            }}
                            className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 group-hover:border-[#FF6A00] transition-colors flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#0D2146] truncate">
                              {student.name}
                            </p>
                            <p className="text-xs text-slate-400 font-mono truncate">
                              @{student.username}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* PROMINENT TOTAL SCORE BADGE */}
                      <td className="py-4 px-6 text-center bg-orange-50/20">
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0D2146] text-white font-black text-sm shadow-xs border border-[#1A3464] group-hover:scale-105 transition-transform">
                            <Zap className="w-3.5 h-3.5 text-[#FF6A00] fill-[#FF6A00]" />
                            <span>{totalScore.toLocaleString()}</span>
                            <span className="text-[10px] text-orange-200 font-normal">
                              {isRtl ? 'امتیاز' : 'pts'}
                            </span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono mt-1 font-medium">
                            ({student.commits}×1 + {student.streakDays}×5)
                          </span>
                        </div>
                      </td>

                      {/* Commits */}
                      <td className="py-4 px-6 text-center">
                        <div className="text-base font-black text-[#0D2146]">
                          {student.commits}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                          {isRtl ? 'کامیت' : 'Commits'}
                        </div>
                      </td>

                      {/* Streak */}
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-[#EA580C] border border-orange-200/80 shadow-2xs">
                          <Flame className="w-3.5 h-3.5 fill-[#FF6A00] text-[#FF6A00]" />
                          <span>
                            {student.streakDays} {isRtl ? 'روز' : student.streakDays === 1 ? 'day' : 'days'}
                          </span>
                        </span>
                      </td>

                      {/* GitHub Link */}
                      <td className={`py-4 px-6 ${isRtl ? 'text-left' : 'text-right'}`}>
                        <a
                          href={student.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-[#0D2146] text-[#0D2146] hover:text-white border border-slate-200 hover:border-[#0D2146] text-xs font-bold transition-all"
                        >
                          <span>{isRtl ? 'پروفایل' : 'Profile'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info strip */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            {isRtl
              ? `نمایش ${filteredAndSortedStudents.length} نفر از مجموع ${students.length} عضو فعال باشگاه`
              : `Showing ${filteredAndSortedStudents.length} of ${students.length} active club members`}
          </span>
          <span className="text-[#FF6A00] font-bold">
            {isRtl
              ? 'فرمول امتیاز: (کامیت × ۱) + (تداوم × ۵)'
              : 'Score: (Commits × 1) + (Streak × 5)'}
          </span>
        </div>
      </div>
    </div>
  );
};
