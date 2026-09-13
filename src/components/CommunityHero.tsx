import React from 'react';
import { ExternalLink, CheckCircle, Sparkles } from 'lucide-react';
import { TechDanaLogo } from './TechDanaLogo';
import { Language } from '../types';

interface CommunityHeroProps {
  language: Language;
}

export const CommunityHero: React.FC<CommunityHeroProps> = ({ language }) => {
  const isRtl = language === 'fa';

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 mb-8 text-center relative overflow-hidden">
      {/* Subtle top accent bar in Navy & Orange */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0D2146] via-[#FF6A00] to-[#0D2146]" />

      <div className="max-w-2xl mx-auto flex flex-col items-center">
        {/* Logo Avatar Badge (Zilink bio-link style) */}
        <div className="relative mb-4">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1.5 bg-white border-2 border-slate-200 shadow-md flex items-center justify-center">
            <TechDanaLogo size={96} />
          </div>
          <div
            className="absolute bottom-0 right-0 bg-[#FF6A00] text-white p-1 rounded-full border-2 border-white shadow-xs"
            title="Verified Community"
          >
            <CheckCircle className="w-4 h-4 fill-[#FF6A00] text-white" />
          </div>
        </div>

        {/* Community Title */}
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-xl sm:text-2xl font-black text-[#0D2146] tracking-tight">
            {isRtl ? 'باشگاه برنامه‌نویسان تک دانا' : 'TechDana Coders Club'}
          </h2>
          <span className="text-xs font-bold text-[#FF6A00] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
            @td_iaun
          </span>
        </div>

        {/* Bio Text */}
        <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-lg mb-4 leading-relaxed">
          {isRtl
            ? 'جامعه تخصصی توسعه‌دهندگان، مهندسی کامپیوتر و هوش مصنوعی دانشگاه آزاد اسلامی نجف‌آباد (IAUN) • رصد پیشرفت و تداوم مشارکت‌های آزاد در گیت‌هاب'
            : 'Computer Science & AI Coders Club at IAUN • Live tracking of student commits, streaks, and GitHub engagement.'}
        </p>

        {/* The 3 Mottos extracted directly from the logo */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-bold text-[#0D2146]">
            <span>🔍</span>
            <span>{isRtl ? 'کشف' : 'Discovery'}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs font-bold text-[#EA580C]">
            <span>💡</span>
            <span>{isRtl ? 'یادگیری' : 'Learning'}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-bold text-[#0D2146]">
            <span>🚀</span>
            <span>{isRtl ? 'نوآوری' : 'Innovation'}</span>
          </div>
        </div>

        {/* Zilink Bio-Link Action Button */}
        <a
          href="https://zil.ink/td_iaun"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-gradient-to-r from-[#0D2146] to-[#173874] hover:from-[#112A57] hover:to-[#1C458E] text-white text-xs font-bold shadow-sm transition-all hover:shadow-md"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#FF6A00]" />
          <span>{isRtl ? 'مشاهده درگاه ارتباطی زی‌لینک (zil.ink/td_iaun)' : 'Visit Official Bio-Link (zil.ink/td_iaun)'}</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
        </a>
      </div>
    </div>
  );
};
