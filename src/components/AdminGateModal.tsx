import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, ShieldAlert, ArrowLeft, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { Language } from '../types';
import { api, setAdminToken } from '../services/api';

interface AdminGateModalProps {
  language: Language;
  onSuccess: (token: string) => void;
  onCancel: () => void;
}

export const AdminGateModal: React.FC<AdminGateModalProps> = ({
  language,
  onSuccess,
  onCancel
}) => {
  const isRtl = language === 'fa';
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim();
    if (!cleanPin) {
      setError(isRtl ? 'لطفاً رمز عبور را وارد کنید' : 'Please enter the admin PIN');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const isValid = await api.verifyAdminPin(cleanPin);
      if (isValid) {
        setAdminToken(cleanPin);
        onSuccess(cleanPin);
      } else {
        setError(
          isRtl
            ? 'رمز عبور مدیریت اشتباه است. دسترسی مجاز نیست.'
            : 'Invalid admin PIN. Access denied.'
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error validating PIN';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#091730]/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0D2146] border border-[#204382] rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 text-white relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#FF6A00]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Icon & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#132A55] border border-[#204382] flex items-center justify-center mb-4 text-[#FF6A00] shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {isRtl ? 'ورود به پنل مدیریت تک‌دانا' : 'TechDana Admin Access'}
          </h2>
          <p className="text-xs text-slate-300 mt-1.5 max-w-xs">
            {isRtl
              ? 'این بخش ویژه مدیران باشگاه است. جهت تغییر اعضا، کلید دسترسی مدیریت را وارد کنید.'
              : 'This section is restricted to club administrators. Enter your admin key to proceed.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              {isRtl ? 'کلید یا رمز عبور ادمین:' : 'Admin PIN / Secret Key:'}
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={isRtl ? 'رمز عبور مدیریت...' : 'Enter admin PIN...'}
                className="w-full px-4 py-3 bg-[#091730] border border-[#204382] rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/30 transition-all text-sm font-mono tracking-wider pl-10 pr-10"
                disabled={isLoading}
              />
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium animate-in fade-in">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:flex-1 py-3 px-4 bg-[#FF6A00] hover:bg-[#E55F00] active:scale-[0.99] text-white rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isRtl ? 'در حال اعتبارسنجی...' : 'Verifying...'}</span>
                </>
              ) : (
                <span>{isRtl ? 'تأیید و ورود' : 'Authenticate'}</span>
              )}
            </button>

            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="w-full sm:w-auto py-3 px-4 bg-[#132A55] hover:bg-[#1C3A72] text-slate-300 hover:text-white rounded-2xl font-bold text-sm border border-[#204382] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              <span>{isRtl ? 'بازگشت' : 'Back'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
