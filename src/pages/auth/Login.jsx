import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import { ROUTES } from '../../constants/routes';
import { login, getCurrentUser } from '../../utils/auth';

const REMEMBERED_EMAIL_KEY = 'urerb_remembered_email';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Populate remembered email if previously stored
    const remembered = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.message || 'Invalid institutional email or password.');
        setLoading(false);
        return;
      }

      if (rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      const role = res.user?.role;
      if (role === 'reviewer') {
        navigate(ROUTES.REVIEWER.DASHBOARD);
      } else if (role === 'secretariat') {
        navigate(ROUTES.SECRETARIAT.DASHBOARD);
      } else {
        navigate(ROUTES.RESEARCHER.DASHBOARD);
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full flex flex-col items-center justify-center">
        {/* Sign In Card */}
        <div className="w-full max-w-[540px] bg-white border border-slate-200/90 p-8 sm:p-9 rounded-xl shadow-xs">
          {/* Card Header */}
          <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100 mb-6">
            <img
              src="/logos/mmsu-seal.png"
              alt="MMSU Seal"
              className="h-16 w-auto mx-auto object-contain mb-3"
            />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight mb-1">
              URERB Portal
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-500 mb-3.5">
              University Research Ethics Review Board
            </p>
            <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-100/90 px-3.5 py-1 rounded border border-slate-200">
              SIGN IN TO YOUR ACCOUNT
            </span>
          </div>

          {/* Form */}
          <form className="flex flex-col gap-4.5" onSubmit={handleSubmit}>
            {/* Error Message Alert */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-150">
                <span className="material-symbols-outlined text-red-500 text-[18px] shrink-0 mt-0.5">
                  error
                </span>
                <div className="flex-1">
                  <strong className="font-semibold">Authentication Failed:</strong> {error}
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-semibold text-slate-800 flex items-center gap-1"
                htmlFor="login-email"
              >
                MMSU Institutional Email <span className="text-red-500">*</span>
              </label>
              <input
                id="login-email"
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="username@mmsu.edu.ph or username"
                className="w-full h-11 px-3.5 bg-white border border-slate-300 text-slate-800 text-xs sm:text-sm placeholder:text-slate-400 rounded focus:outline-none focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b] transition-colors"
              />
              <span className="text-[11px] text-slate-400 mt-0.5">
                Use your official @mmsu.edu.ph address or account username
              </span>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-semibold text-slate-800 flex items-center gap-1"
                htmlFor="login-password"
              >
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-3.5 pr-11 bg-white border border-slate-300 text-slate-800 text-xs sm:text-sm placeholder:text-slate-400 rounded focus:outline-none focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-1.5 flex items-center justify-center focus:outline-none cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#1e513b] focus:ring-0 cursor-pointer accent-[#1e513b]"
                />
                <span className="text-[12px]">Remember my institutional email</span>
              </label>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-1 bg-[#1e513b] hover:bg-[#163f2e] text-white text-xs sm:text-sm font-semibold rounded shadow-xs transition-colors flex items-center justify-center cursor-pointer border border-[#163f2e] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                'Log In'
              )}
            </button>

            {/* Create Account Link */}
            <div className="flex items-center justify-center gap-1.5 text-xs pt-0.5">
              <span className="text-slate-500">Don't have an account?</span>
              <Link
                to={ROUTES.AUTH.REGISTER}
                className="text-[#1e513b] font-semibold hover:underline"
              >
                Create Account
              </Link>
            </div>

            {/* Notice Alert Box */}
            <div className="mt-1 p-3 bg-slate-50/90 border border-slate-200 rounded-lg">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-slate-400 text-[18px] mt-0.5 shrink-0">
                  info
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong className="font-semibold text-slate-700">Notice:</strong> Only active MMSU
                  faculty, researchers, and students with verified credentials can access URERB
                  protocols.
                </p>
              </div>
            </div>
          </form>
        </div>

        {/* Security Stamp */}
        <div className="mt-6 flex items-center gap-2 font-mono text-[11px] text-slate-400">
          <span>SYSTEM NODE: AUTH-01</span>
          <span>•</span>
          <span>SECURE CONNECTION (TLS 1.3)</span>
        </div>
      </div>
    </AuthLayout>
  );
}
