import React from 'react';
import { Trophy, Shield, Users, Globe, ExternalLink, LogOut } from 'lucide-react';
import { ViewMode, Language } from '../types';
import { TechDanaLogo } from './TechDanaLogo';

interface HeaderProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  studentCount: number;
  language: Language;
  onToggleLanguage: () => void;
  isAdminAuthenticated?: boolean;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  studentCount,
  language,
  onToggleLanguage,
  isAdminAuthenticated,
  onLogout
}) => {
  const isRtl = language === 'fa';

  return (
    <header className="bg-[#0D2146] text-white border-b border-[#1A3464] sticky top-0 z-40 shadow-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3.5">
          <div className="p-1 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
            <TechDanaLogo size={42} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                {isRtl ? 'باشگاه برنامه‌نویسان تک دانا' : 'TechDana Coders Club'}
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FF6A00] text-white px-2 py-0.5 rounded-full shadow-2xs">
                {isRtl ? 'رتبه‌بندی' : 'Leaderboard'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 font-medium">
              {isRtl ? 'رصد زنده فعالیت و تداوم مشارکت‌های گیت‌هاب' : 'Live GitHub Commit & Streak Tracker'}
            </p>
          </div>
        </div>

        {/* Right Navigation & Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Zilink Bio-Link Button */}
          <a
            href="https://zil.ink/td_iaun"
            target="_blank"
            rel="noreferrer"
            title="zil.ink/td_iaun"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#132A55] hover:bg-[#1C3A72] border border-[#204382] text-xs font-semibold text-orange-200 hover:text-white transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-[#FF6A00] animate-pulse"></span>
            <span>zil.ink/td_iaun</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Language / RTL Switcher */}
          <button
            type="button"
            onClick={onToggleLanguage}
            title={isRtl ? 'تغییر به انگلیسی (LTR)' : 'Switch to Persian (RTL)'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#132A55] hover:bg-[#1C3A72] border border-[#204382] text-xs font-bold text-slate-200 transition-all"
          >
            <Globe className="w-3.5 h-3.5 text-[#FF6A00]" />
            <span>{isRtl ? 'EN' : 'فارسی'}</span>
          </button>

          {/* View Mode Toggle Button Group */}
          <div className="bg-[#091730] p-1 rounded-xl border border-[#1A3464] flex items-center text-xs font-semibold">
            <button
              type="button"
              onClick={() => onViewChange('leaderboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                currentView === 'leaderboard'
                  ? 'bg-[#FF6A00] text-white shadow-sm font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{isRtl ? 'رتبه‌بندی' : 'Leaderboard'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                currentView === 'leaderboard' ? 'bg-[#D95500] text-white' : 'bg-[#132A55] text-slate-300'
              }`}>
                {studentCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onViewChange('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                currentView === 'admin'
                  ? 'bg-[#FF6A00] text-white shadow-sm font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isRtl ? 'پنل مدیریت' : 'Admin'}</span>
            </button>
          </div>

          {currentView === 'admin' && isAdminAuthenticated && onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title={isRtl ? 'خروج از حساب مدیریت' : 'Log out of Admin'}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isRtl ? 'خروج' : 'Logout'}</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
