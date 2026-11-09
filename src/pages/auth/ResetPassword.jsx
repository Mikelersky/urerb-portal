import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import { ROUTES } from '../../constants/routes';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return;
    setIsSuccess(true);
    setTimeout(() => {
      navigate(ROUTES.AUTH.LOGIN);
    }, 1500);
  };

  return (
    <AuthLayout>
      <div className="w-full flex flex-col items-center justify-center py-4">
        {/* Reset Password Card */}
        <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm my-4">
          <div className="border-b border-slate-100 pb-5 mb-5 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-slate-200 bg-slate-100 text-xs text-slate-700 rounded-full mb-3.5">
              <span className="material-symbols-outlined text-[16px] text-[#1e513b]">
                lock_reset
              </span>
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Set New Password
              </span>
            </div>
            <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight leading-tight">
              Create New Password
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Mariano Marcos State University · URERB Portal
            </p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-800" htmlFor="new-password">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-3.5 pr-11 bg-white border border-slate-300 text-slate-800 text-sm placeholder:text-slate-400 rounded focus:outline-none focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-1.5 flex items-center justify-center focus:outline-none cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              <span className="text-[11px] text-slate-400">Minimum 8 characters</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-800" htmlFor="confirm-new-password">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <input
                id="confirm-new-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 px-3.5 bg-white border border-slate-300 text-slate-800 text-sm placeholder:text-slate-400 rounded focus:outline-none focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b] transition-colors"
              />
            </div>

            {isSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs">
                Password updated successfully! Redirecting to login...
              </div>
            )}

            <button
              type="submit"
              className="w-full h-11 mt-1 bg-[#1e513b] hover:bg-[#163f2e] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer border border-[#163f2e]"
            >
              <span>Update Password</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>

            <Link
              to={ROUTES.AUTH.LOGIN}
              className="w-full h-11 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold border border-slate-300 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Back to Login</span>
            </Link>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
}
