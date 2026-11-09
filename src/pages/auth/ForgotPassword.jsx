import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import { ROUTES } from '../../constants/routes';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSent(true);
    }, 600);
  };

  return (
    <AuthLayout>
      <div className="w-full flex flex-col items-center justify-center">
        {/* Reset Password Card */}
        <div className="w-full max-w-[560px] bg-white border border-slate-200/90 rounded-xl p-7 sm:p-8 shadow-xs">
          {/* Card Header */}
          <div className="border-b border-slate-100 pb-4 mb-4 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 border border-slate-200 bg-slate-100 text-xs text-slate-700 rounded-full mb-3">
              <span className="material-symbols-outlined text-[16px] text-[#1e513b]">
                lock_reset
              </span>
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Password Recovery
              </span>
            </div>
            <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight leading-tight">
              Reset Password
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Mariano Marcos State University · URERB Portal
            </p>
          </div>

          {/* Description */}
          <div className="mb-3.5">
            <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
              Enter your registered MMSU institutional email address below. We will send you an official
              link to securely reset your account credentials.
            </p>
          </div>

          {/* Notice Box */}
          <div className="mb-4 bg-slate-50/90 border border-slate-200 rounded-lg p-3.5 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#1e513b] text-[18px] shrink-0 mt-0.5">
              info
            </span>
            <div className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-800">Notice:</span> The recovery link will
              remain active for <span className="font-semibold text-slate-800">15 minutes</span> upon
              generation and will only be delivered to verified{' '}
              <span className="font-mono text-[11px] font-semibold text-[#1e513b] whitespace-nowrap">
                @mmsu.edu.ph
              </span>{' '}
              institutional accounts.
            </div>
          </div>

          {/* Form */}
          <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-semibold text-slate-800 flex items-center justify-between"
                htmlFor="forgot-email"
              >
                <span className="flex items-center gap-1">
                  MMSU Institutional Email <span className="text-red-500">*</span>
                </span>
                <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 border border-slate-200 rounded shrink-0 whitespace-nowrap">
                  @mmsu.edu.ph
                </span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[18px]">
                  mail
                </span>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="username@mmsu.edu.ph"
                  className="w-full h-11 pl-10 pr-4 text-slate-800 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:border-[#1e513b] focus:outline-none focus:ring-1 focus:ring-[#1e513b] placeholder:text-slate-400 transition-colors"
                />
              </div>
              <span className="text-[11px] text-slate-400">
                Must match the authorized @mmsu.edu.ph account registered with the ethics board.
              </span>
            </div>

            {/* Success Feedback Alert */}
            {isSent && (
              <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs leading-relaxed animate-fadeIn">
                <span className="material-symbols-outlined text-emerald-700 text-[18px] shrink-0 mt-0.5">
                  check_circle
                </span>
                <div>
                  <span className="font-bold text-slate-900 block text-xs">Recovery Dispatch Initiated</span>
                  <p className="text-slate-600 mt-0.5 text-[11px]">
                    If the address is enrolled, a verification token has been routed to your inbox. The link expires in 15 minutes.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                id="submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 bg-[#1e513b] hover:bg-[#163f2e] text-white text-xs sm:text-sm font-semibold border border-[#163f2e] rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      progress_activity
                    </span>
                    <span>Processing...</span>
                  </>
                ) : isSent ? (
                  <>
                    <span>Link Sent</span>
                    <span className="material-symbols-outlined text-[16px]">done</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </>
                )}
              </button>

              <Link
                to={ROUTES.AUTH.LOGIN}
                className="w-full h-10 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold border border-slate-300 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Back to Login</span>
              </Link>
            </div>
          </form>

          {/* Support Callout */}
          <div className="mt-4 pt-3.5 border-t border-slate-100">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-slate-400 text-[18px] shrink-0 mt-0.5">
                contact_support
              </span>
              <div className="text-[11px] text-slate-500 leading-relaxed">
                Need assistance with your MMSU email or review board access? Contact the MMSU ITC or
                URERB Secretariat at{' '}
                <a
                  href="mailto:urerb@mmsu.edu.ph"
                  className="text-[#1e513b] underline font-medium hover:text-[#163f2e]"
                >
                  urerb@mmsu.edu.ph
                </a>
                .
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
