import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import { ROUTES } from '../../constants/routes';
import {
  getPendingRegistration,
  saveRegisteredUser,
  setCurrentUser,
  clearPendingRegistration,
} from '../../utils/auth';

export default function EmailVerification() {
  const navigate = useNavigate();
  const [digits, setDigits] = useState(['4', '8', '2', '', '', '']);
  const pendingUser = getPendingRegistration();
  const targetEmail = pendingUser?.email || 'jdelacruz@mmsu.edu.ph';

  const handleDigitChange = (index, value) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    // Auto advance focus
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerify = (e) => {
    e.preventDefault();
    if (pendingUser) {
      saveRegisteredUser(pendingUser);
      setCurrentUser(pendingUser);
      clearPendingRegistration();
    }
    navigate(ROUTES.RESEARCHER.DASHBOARD);
  };

  return (
    <AuthLayout>
      <div className="w-full flex flex-col items-center justify-center">
        {/* Verification Card */}
        <div className="w-full max-w-[620px] bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
          {/* Header Block */}
          <div className="py-6 px-6 sm:px-10 border-b border-slate-100 text-center flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-slate-100 rounded border border-slate-200 mb-3">
              <span className="material-symbols-outlined text-[16px] text-[#1e513b]">
                mark_email_unread
              </span>
              <span className="font-mono text-[11px] text-slate-700 tracking-wider font-semibold uppercase">
                Email Verification
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              Verify Institutional Email
            </h1>
            <p className="text-xs text-slate-500">MMSU Research Ethics Review Board</p>
          </div>

          {/* Main Content Form */}
          <div className="py-6 px-6 sm:px-10 flex flex-col gap-6">
            {/* Notice & Email Display */}
            <div className="flex flex-col gap-2 text-center items-center">
              <p className="text-xs sm:text-[13px] text-slate-600 max-w-md">
                A 6-digit verification code has been sent to your MMSU institutional email address:
              </p>
              <div className="w-full max-w-md bg-slate-50 border border-slate-200 px-5 py-2.5 rounded flex items-center justify-center gap-2 my-1">
                <span className="material-symbols-outlined text-[18px] text-slate-500">
                  domain
                </span>
                <span className="font-mono text-sm sm:text-base text-slate-900 font-semibold tracking-wide select-all">
                  {targetEmail}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Please check your inbox or spam folder. The code expires in 15 minutes.
              </p>
            </div>

            {/* Segmented Digit Entry */}
            <form onSubmit={handleVerify} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs sm:text-sm font-semibold text-slate-800">
                    Enter 6-Digit Verification Code <span className="text-red-500">*</span>
                  </label>
                  <span className="font-mono text-xs text-slate-500 tracking-wider">
                    SEC-ID: 7048
                  </span>
                </div>
                <div className="flex justify-between gap-2 sm:gap-3" id="otp-container">
                  {digits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-input-${idx}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      placeholder="•"
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="w-12 h-14 sm:w-16 sm:h-16 text-center font-mono text-xl sm:text-2xl font-bold bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b] transition-colors"
                    />
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Single-use OTP code generated via MMSU Academic Identity Gateway.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-1">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#1e513b] hover:bg-[#163f2e] text-white font-semibold text-xs sm:text-sm rounded shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-[#163f2e]"
                >
                  <span>Verify & Proceed</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>

                {/* Resend Row */}
                <div className="flex items-center justify-between px-1 text-xs text-slate-500">
                  <span>Didn't receive the code?</span>
                  <button
                    type="button"
                    className="font-medium text-[#1e513b] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Resend Code</span>
                    <span className="font-mono text-xs text-slate-600">(0:44)</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Card Footer Link */}
          <div className="px-6 sm:px-10 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <Link
              to={ROUTES.AUTH.LOGIN}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#1e513b] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back to Registration / Login</span>
            </Link>
            <span className="font-mono text-xs text-slate-400">v2.4.1-rc</span>
          </div>
        </div>

        {/* Technical Context Note */}
        <div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="material-symbols-outlined text-[14px]">info</span>
          <span>Institutional Authentication Services • Mariano Marcos State University</span>
        </div>
      </div>
    </AuthLayout>
  );
}
