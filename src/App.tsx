import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { CommunityHero } from './components/CommunityHero';
import { LeaderboardView } from './components/LeaderboardView';
import { AdminView } from './components/AdminView';
import { AdminGateModal } from './components/AdminGateModal';
import { Student, ViewMode, Language } from './types';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { TechDanaLogo } from './components/TechDanaLogo';
import { api, getAdminToken, clearAdminToken } from './services/api';

const LANG_STORAGE_KEY = 'techdana_preferred_lang';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLeaderboard = location.pathname !== '/admin';
  const currentView: ViewMode = isLeaderboard ? 'leaderboard' : 'admin';

  const [adminToken, setAdminTokenState] = useState<string | null>(() => getAdminToken());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Language preference management
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const savedLang = localStorage.getItem(LANG_STORAGE_KEY);
      if (savedLang === 'fa' || savedLang === 'en') {
        return savedLang;
      }
    } catch {
      // ignore
    }
    return 'fa';
  });

  const isRtl = language === 'fa';

  const handleToggleLanguage = () => {
    const nextLang = language === 'fa' ? 'en' : 'fa';
    setLanguage(nextLang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, nextLang);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [isRtl, language]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleLogout = () => {
    clearAdminToken();
    setAdminTokenState(null);
    navigate('/');
    showToast(isRtl ? 'از پنل مدیریت خارج شدید.' : 'Logged out of admin panel.');
  };

  // Fetch shared state from server SQLite database
  const loadLeaderboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getLeaderboard();
      if (Array.isArray(data)) {
        setStudents(data);
      }
    } catch (err: unknown) {
      console.warn('[App] Could not fetch server leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const handleAuthError = (err: unknown) => {
    if (err instanceof Error && (err.message.includes('401') || err.message.toLowerCase().includes('unauthorized'))) {
      clearAdminToken();
      setAdminTokenState(null);
      showToast(
        isRtl
          ? 'اعتبار نشست مدیریت منقضی شد. لطفاً مجدداً رمز را وارد کنید.'
          : 'Admin session expired. Please re-authenticate.'
      );
    }
  };

  // Add new student to SQLite backend
  const handleAddStudent = async (newStudentData: Omit<Student, 'id'>) => {
    try {
      const saved = await api.addStudent(newStudentData);
      // Reload leaderboard to preserve server-side sorting
      const freshList = await api.getLeaderboard();
      setStudents(freshList);
      showToast(
        isRtl
          ? `دانشجو @${saved.username} در پایگاه داده مشترک ذخیره شد!`
          : `Saved @${saved.username} to shared database!`
      );
    } catch (err: unknown) {
      handleAuthError(err);
      const msg = err instanceof Error ? err.message : 'Error adding student';
      showToast(msg);
      throw err;
    }
  };

  // Remove student from SQLite backend
  const handleRemoveStudent = async (id: string) => {
    const student = students.find((s) => s.id === id);
    try {
      await api.deleteStudent(id);
      setStudents((prev) => prev.filter((s) => s.id !== id));
      if (student) {
        showToast(
          isRtl
            ? `دانشجو @${student.username} از پایگاه داده حذف شد.`
            : `Removed @${student.username} from shared database.`
        );
      }
    } catch (err: unknown) {
      handleAuthError(err);
      const msg = err instanceof Error ? err.message : 'Error removing student';
      showToast(msg);
    }
  };

  // Synchronize all cohort members with live GitHub metrics
  const handleSyncAllStudents = async () => {
    try {
      const res = await api.syncAllStudents();
      const freshList = await api.getLeaderboard();
      setStudents(freshList);
      showToast(
        isRtl
          ? `بروزرسانی زنده انجام شد: ${res.stats.updated} عضو بروزرسانی شدند.`
          : `Sync completed: ${res.stats.updated} members updated.`
      );
    } catch (err: unknown) {
      handleAuthError(err);
      const msg = err instanceof Error ? err.message : 'Error syncing members';
      showToast(msg);
      throw err;
    }
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#F8FAFC] text-[#0D2146] flex flex-col font-sans selection:bg-orange-100 selection:text-[#FF6A00]"
    >
      {/* Header with TechDana Branding & View Switcher */}
      <Header
        currentView={currentView}
        onViewChange={(view) => navigate(view === 'admin' ? '/admin' : '/')}
        studentCount={students.length}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        isAdminAuthenticated={Boolean(adminToken)}
        onLogout={handleLogout}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            isRtl ? 'left-6' : 'right-6'
          }`}
        >
          <div className="bg-[#0D2146] text-white px-4 py-3 rounded-2xl shadow-xl border border-[#1A3464] text-xs font-bold flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#FF6A00]" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <CommunityHero language={language} />
                <LeaderboardView students={students} language={language} />
              </>
            }
          />
          <Route
            path="/admin"
            element={
              adminToken ? (
                <AdminView
                  students={students}
                  onAddStudent={handleAddStudent}
                  onRemoveStudent={handleRemoveStudent}
                  onSyncAll={handleSyncAllStudents}
                  language={language}
                />
              ) : (
                <AdminGateModal
                  language={language}
                  onSuccess={(token) => {
                    setAdminTokenState(token);
                    showToast(
                      isRtl
                        ? 'احراز هویت مدیریت با موفقیت انجام شد.'
                        : 'Admin authentication successful.'
                    );
                  }}
                  onCancel={() => navigate('/')}
                />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Modern Bio-Link Styled Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-3">
            <TechDanaLogo size={32} />
            <div>
              <span className="font-bold text-[#0D2146]">
                {isRtl ? 'باشگاه برنامه‌نویسان تک دانا (TechDana Coders Club)' : 'TechDana Coders Club'}
              </span>
              <span className="text-slate-400 mx-2">•</span>
              <span className="text-slate-500">
                {isRtl ? 'دانشگاه آزاد اسلامی واحد نجف‌آباد (IAUN)' : 'IAUN Computer Science & AI'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://zil.ink/td_iaun"
              target="_blank"
              rel="noreferrer"
              className="text-[#FF6A00] hover:text-[#E55F00] font-bold inline-flex items-center gap-1.5 transition-colors"
            >
              <span>{isRtl ? 'درگاه زی‌لینک: zil.ink/td_iaun' : 'Official Bio-Link: zil.ink/td_iaun'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <span className="text-slate-300">|</span>

            <button
              type="button"
              onClick={() => navigate(currentView === 'leaderboard' ? '/admin' : '/')}
              className="text-[#0D2146] hover:text-[#FF6A00] font-bold transition-colors cursor-pointer"
            >
              {currentView === 'leaderboard'
                ? isRtl ? 'ورود به پنل مدیریت' : 'Switch to Admin View'
                : isRtl ? 'بازگشت به رتبه‌بندی عمومی' : 'Back to Public Leaderboard'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
