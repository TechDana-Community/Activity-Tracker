import React, { useState } from 'react';
import {
  UserPlus,
  Github,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Flame,
  GitCommit,
  ExternalLink,
  RefreshCw,
  FolderGit2,
  Zap
} from 'lucide-react';
import { Student, Language } from '../types';
import { extractGitHubUsername, calculateTotalScore } from '../utils/github';
import { api, GitHubLookupResult } from '../services/api';

interface AdminViewProps {
  students: Student[];
  onAddStudent: (newStudent: Omit<Student, 'id'>) => void;
  onRemoveStudent: (id: string) => void;
  onSyncAll?: () => Promise<void>;
  language: Language;
}

export const AdminView: React.FC<AdminViewProps> = ({
  students,
  onAddStudent,
  onRemoveStudent,
  onSyncAll,
  language
}) => {
  const isRtl = language === 'fa';
  const [profileUrl, setProfileUrl] = useState('');
  const [customName, setCustomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [fetchedData, setFetchedData] = useState<GitHubLookupResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSyncAllClick = async () => {
    if (!onSyncAll || isSyncingAll) return;
    setIsSyncingAll(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await onSyncAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      setErrorMsg(msg);
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Fetch GitHub live data via server proxy for the entered username or link
  const handleFetchData = async (inputToFetch?: string) => {
    const raw = inputToFetch !== undefined ? inputToFetch : profileUrl;
    const username = extractGitHubUsername(raw);

    if (!username || username.length < 1) {
      setErrorMsg(
        isRtl
          ? 'لطفاً ابتدا نام کاربری یا لینک معتبر گیت‌هاب را وارد کنید.'
          : 'Please enter a valid GitHub username or profile link first.'
      );
      return null;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const data = await api.lookupStudent(username, isRtl);
      setFetchedData(data);
      if (!customName || customName === username) {
        setCustomName(data.name);
      }
      return data;
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : isRtl
          ? 'خطا در ارتباط با گیت‌هاب'
          : 'Error connecting to GitHub';
      setErrorMsg(msg);
      setFetchedData(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const username = extractGitHubUsername(profileUrl);

    if (!username || username.length < 1) {
      setErrorMsg(
        isRtl
          ? 'لطفاً لینک یا نام کاربری معتبر گیت‌هاب را وارد نمایید.'
          : 'Please paste a valid GitHub profile URL or username.'
      );
      return;
    }

    // Check if already in the cohort
    const exists = students.some(
      (s) => s.username.toLowerCase() === username.toLowerCase()
    );
    if (exists) {
      setErrorMsg(
        isRtl
          ? `دانشجو با نام کاربری @${username} قبلاً در جدول رتبه‌بندی ثبت شده است.`
          : `Student with GitHub username "@${username}" is already on the leaderboard.`
      );
      return;
    }

    // If data not yet fetched or different username, fetch live now
    let dataToUse = fetchedData;
    if (!dataToUse || dataToUse.username.toLowerCase() !== username.toLowerCase()) {
      dataToUse = await handleFetchData(username);
      if (!dataToUse) {
        // Failed to fetch, error already set
        return;
      }
    }

    const newStudent: Omit<Student, 'id'> = {
      name: customName.trim() || dataToUse.name || dataToUse.username,
      username: dataToUse.username,
      githubUrl: dataToUse.githubUrl,
      avatarUrl: dataToUse.avatarUrl,
      commits: dataToUse.commits,
      streakDays: dataToUse.streakDays,
      totalScore: dataToUse.totalScore,
      lastActive: dataToUse.lastActive,
      bio: dataToUse.bio,
      publicRepos: dataToUse.publicRepos
    };

    onAddStudent(newStudent);
    setSuccessMsg(
      isRtl
        ? `دانشجو @${dataToUse.username} با موفقیت و دریافت زنده داده‌های گیت‌هاب ثبت شد!`
        : `Successfully added @${dataToUse.username} with live GitHub metrics!`
    );

    // Reset form
    setProfileUrl('');
    setCustomName('');
    setFetchedData(null);
  };

  const handleQuickPaste = async (sampleUrl: string) => {
    setProfileUrl(sampleUrl);
    setErrorMsg(null);
    setSuccessMsg(null);
    await handleFetchData(sampleUrl);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Admin Mode Explainer Banner */}
      <div className="bg-[#0D2146]/5 border border-[#0D2146]/15 rounded-3xl p-5 sm:p-6 flex items-start gap-4">
        <div className="p-2.5 bg-[#0D2146] text-[#FF6A00] rounded-2xl flex-shrink-0 mt-0.5 shadow-xs">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-[#0D2146]">
            {isRtl
              ? 'پنل مدیریت باشگاه برنامه‌نویسان تک دانا'
              : 'TechDana Coders Club Admin View'}
          </h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
            {isRtl
              ? 'در این بخش تنها با وارد کردن نام کاربری یا لینک گیت‌هاب دانشجو، تمامی اطلاعات (تصویر پروفایل، تعداد کامیت‌ها از رویدادهای Push و محاسبه تداوم فعالیت پیاپی) به شکل خودکار و مستقیم از API رایگان گیت‌هاب دریافت و ثبت می‌شود.'
              : 'Simply paste any student GitHub profile URL or handle. The system automatically fetches avatar, display name, verified commit count from PushEvents, and active day streaks via GitHub REST API.'}
          </p>
        </div>
      </div>

      {/* Add Student Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#FF6A00]">
            <UserPlus className="w-4 h-4" />
          </div>
          <h3 className="text-lg font-black text-[#0D2146]">
            {isRtl ? 'ثبت هوشمند دانشجو در باشگاه برنامه‌نویسان' : 'Register Student via Live GitHub Sync'}
          </h3>
        </div>
        <p className="text-xs text-slate-500 mb-6 font-medium">
          {isRtl
            ? 'لینک یا نام کاربری گیت‌هاب را وارد کنید تا آمار کامیت‌ها و تداوم بدون نیاز به ورود دستی، زنده محاسبه شود.'
            : 'Enter the GitHub profile or username. Commits and active streaks will be retrieved automatically from GitHub.'}
        </p>

        {/* Feedback alerts */}
        {errorMsg && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* GitHub Profile URL / Handle input */}
          <div>
            <label className="block text-xs font-black text-[#0D2146] uppercase tracking-wider mb-2">
              {isRtl ? 'لینک پروفایل یا آیدی گیت‌هاب دانشجو' : 'Student GitHub Profile Link or Handle'}{' '}
              <span className="text-[#FF6A00]">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Github
                  className={`w-5 h-5 absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                    isRtl ? 'right-3.5' : 'left-3.5'
                  }`}
                />
                <input
                  type="text"
                  required
                  value={profileUrl}
                  onChange={(e) => {
                    setProfileUrl(e.target.value);
                    setErrorMsg(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !fetchedData) {
                      e.preventDefault();
                      handleFetchData();
                    }
                  }}
                  placeholder={
                    isRtl
                      ? 'مثال: Hosein-Ghojavand یا https://github.com/Hosein-Ghojavand'
                      : 'e.g. Hosein-Ghojavand or https://github.com/Hosein-Ghojavand'
                  }
                  className={`w-full py-3 rounded-2xl border border-slate-200 text-sm focus:bg-white focus:outline-hidden focus:border-[#FF6A00] focus:ring-2 focus:ring-orange-100 transition-all font-mono ${
                    isRtl ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4 text-left'
                  }`}
                />
              </div>

              {/* Fetch GitHub Live Data Button with Loading Spinner */}
              <button
                type="button"
                onClick={() => handleFetchData()}
                disabled={isLoading || !profileUrl.trim()}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-50 text-[#0D2146] text-xs font-bold transition-all border border-slate-200 shadow-2xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 text-[#FF6A00] animate-spin" />
                    <span>{isRtl ? 'در حال دریافت اطلاعات...' : 'Fetching Live Data...'}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                    <span>{isRtl ? 'استعلام از گیت‌هاب' : 'Fetch from GitHub'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick-fill sample links */}
            <div className="flex items-center gap-2 mt-2.5 text-xs text-slate-500 font-medium flex-wrap">
              <span>{isRtl ? 'نمونه‌های آماده برای تست سریع:' : 'Quick test samples:'}</span>
              <button
                type="button"
                onClick={() => handleQuickPaste('Hosein-Ghojavand')}
                className="text-[#FF6A00] hover:underline font-bold"
              >
                Hosein-Ghojavand
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => handleQuickPaste('octocat')}
                className="text-[#FF6A00] hover:underline font-bold"
              >
                octocat
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => handleQuickPaste('torvalds')}
                className="text-[#FF6A00] hover:underline font-bold"
              >
                torvalds
              </button>
            </div>
          </div>

          {/* Live Fetched Data Preview Card (Shows real retrieved metrics) */}
          {fetchedData && (
            <div className="p-4 sm:p-5 rounded-2xl bg-orange-50/50 border border-orange-200/80 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={fetchedData.avatarUrl}
                    alt={fetchedData.username}
                    className="w-12 h-12 rounded-full border-2 border-[#FF6A00] object-cover shadow-2xs"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-[#0D2146]">
                        {fetchedData.name || fetchedData.username}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        @{fetchedData.username}
                      </span>
                    </div>
                    {fetchedData.bio && (
                      <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                        {fetchedData.bio}
                      </p>
                    )}
                  </div>
                </div>

                {/* Real Fetched Metrics Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Total Score Badge */}
                  <div className="px-3 py-1.5 rounded-xl bg-[#0D2146] text-white border border-[#1A3464] shadow-2xs flex items-center gap-1.5 text-xs font-bold">
                    <Zap className="w-3.5 h-3.5 text-[#FF6A00] fill-[#FF6A00]" />
                    <span>{calculateTotalScore(fetchedData.commits, fetchedData.streakDays)}</span>
                    <span className="text-orange-200 text-[10px] font-normal">
                      {isRtl ? 'امتیاز کل' : 'pts'}
                    </span>
                  </div>

                  <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center gap-1.5 text-xs font-bold text-[#0D2146]">
                    <GitCommit className="w-3.5 h-3.5 text-[#FF6A00]" />
                    <span>{fetchedData.commits}</span>
                    <span className="text-slate-400 text-[10px] font-normal">
                      {isRtl ? 'کامیت (Push)' : 'commits'}
                    </span>
                  </div>

                  <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center gap-1.5 text-xs font-bold text-[#EA580C]">
                    <Flame className="w-3.5 h-3.5 fill-[#FF6A00] text-[#FF6A00]" />
                    <span>{fetchedData.streakDays}</span>
                    <span className="text-slate-400 text-[10px] font-normal">
                      {isRtl ? 'روز تداوم' : 'd streak'}
                    </span>
                  </div>

                  <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{fetchedData.publicRepos}</span>
                    <span className="text-slate-400 text-[10px] font-normal">
                      {isRtl ? 'ریپازیتوری' : 'repos'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Optional Display Name (Auto-populated from GitHub) */}
          <div>
            <label className="block text-xs font-bold text-[#0D2146] mb-2">
              {isRtl
                ? 'نام نمایشی دانشجو (اختیاری - در صورت نیاز به ثبت نام فارسی)'
                : 'Display Name (Optional - auto-filled from GitHub)'}
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={
                isRtl
                  ? fetchedData?.name || 'مثال: محمدحسین قجاوند'
                  : fetchedData?.name || 'e.g. Hosein Ghojavand'
              }
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-[#FF6A00]"
            />
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              {isRtl
                ? 'آمار کامیت‌ها و تداوم متوالی مستقیماً از گیت‌هاب واکشی می‌شوند و نیاز به وارد کردن دستی ندارند.'
                : 'Commits and streaks are automatically derived live from GitHub public activity.'}
            </p>
          </div>

          {/* Submit Button (TechDana Orange) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#FF6A00] hover:bg-[#E55F00] active:scale-98 disabled:opacity-60 text-white text-xs font-bold transition-all shadow-sm hover:shadow-md"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                  <span>{isRtl ? 'در حال واکشی و ثبت...' : 'Fetching & Adding...'}</span>
                </>
              ) : (
                <>
                  <span>
                    {isRtl
                      ? 'ثبت دانشجو در باشگاه برنامه‌نویسان تک دانا'
                      : 'Add Student to TechDana Coders Club'}
                  </span>
                  <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Roster Management Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-black text-[#0D2146]">
              {isRtl
                ? `مدیریت اعضای ثبت‌شده در باشگاه (${students.length} نفر)`
                : `Manage Registered Club Members (${students.length})`}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              {isRtl
                ? 'فهرست افراد حاضر در جدول عمومی باشگاه برنامه‌نویسان تک دانا'
                : 'Review active students and manage their presence in the public club standings'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {onSyncAll && (
              <button
                type="button"
                onClick={handleSyncAllClick}
                disabled={isSyncingAll}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0D2146] hover:bg-[#1A3464] active:scale-98 disabled:opacity-60 text-white text-xs font-bold transition-all shadow-2xs"
              >
                {isSyncingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-[#FF6A00] animate-spin" />
                    <span>{isRtl ? 'در حال بروزرسانی اعضا...' : 'Syncing Members...'}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-[#FF6A00]" />
                    <span>{isRtl ? 'بروزرسانی زنده تمام اعضا' : 'Sync All Members'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* List of enrolled students with Delete action */}
        <div className="divide-y divide-slate-100">
          {students.map((student) => (
            <div
              key={student.id || student.username}
              className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <img
                  src={student.avatarUrl}
                  alt={student.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      student.name || student.username
                    )}&background=0D2146&color=fff`;
                  }}
                  className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 flex-shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#0D2146] truncate">
                    {student.name}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono truncate">
                    @{student.username}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#0D2146] text-white text-[11px] font-black shadow-2xs">
                    <Zap className="w-3 h-3 text-[#FF6A00] fill-[#FF6A00]" />
                    <span>{calculateTotalScore(student.commits, student.streakDays)}</span>
                    <span className="text-orange-200 text-[9px] font-normal">{isRtl ? 'امتیاز' : 'pts'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                    {student.commits} {isRtl ? 'کامیت' : 'c'} • {student.streakDays} {isRtl ? 'روز تداوم' : 'd streak'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveStudent(student.id)}
                  title={isRtl ? 'حذف از رتبه‌بندی' : 'Remove from Leaderboard'}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
