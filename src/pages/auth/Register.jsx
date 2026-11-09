import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import { ROUTES } from '../../constants/routes';
import { register } from '../../utils/auth';

const CATEGORY_LABELS = {
  faculty: 'Faculty Researcher',
  student: 'Student Researcher',
  graduate: 'Graduate Student',
  external: 'External Researcher',
};

const ACADEMIC_UNIT_LABELS = {
  cafsd: 'College of Agriculture, Food and Sustainable Development (CAFSD)',
  cas: 'College of Arts and Sciences (CAS)',
  cbae: 'College of Business, Accountancy and Economics (CBAE)',
  coe: 'College of Engineering (COE)',
  chs: 'College of Health Sciences (CHS)',
  cte: 'College of Teacher Education (CTE)',
  gs: 'Graduate School',
  external: 'External / Other Affiliate',
};

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [category, setCategory] = useState('');
  const [academicUnit, setAcademicUnit] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@mmsu.edu.ph')) {
      setError('Registration requires an official @mmsu.edu.ph institutional email address.');
      return;
    }

    const unitLabel = ACADEMIC_UNIT_LABELS[academicUnit] || academicUnit;
    const categoryLabel = CATEGORY_LABELS[category] || category;

    setLoading(true);

    try {
      const res = await register({
        fullName: fullName.trim(),
        category,
        academicUnit: `${unitLabel} - ${categoryLabel}`,
        email: cleanEmail,
        password,
        confirmPassword,
      });

      if (!res.success) {
        setError(res.message || 'Registration failed. Please check your details.');
        setLoading(false);
        return;
      }

      navigate(ROUTES.RESEARCHER.DASHBOARD);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full flex flex-col items-center justify-center">
        {/* Registration Card */}
        <div className="w-full max-w-[620px] bg-white border border-slate-200/90 rounded-xl shadow-xs p-7 sm:p-9">
          {/* Card Header */}
          <div className="flex flex-col items-center text-center">
            <img
              src="/logos/mmsu-seal.png"
              alt="MMSU Seal"
              className="h-16 w-auto mx-auto object-contain mb-2.5"
            />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              URERB Portal
            </h1>
            <p className="text-xs font-medium text-slate-500 tracking-wide mt-0.5">
              University Research Ethics Review Board
            </p>
            <div className="mt-3.5 inline-block px-3.5 py-1 bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-700 uppercase tracking-widest">
              CREATE RESEARCHER ACCOUNT
            </div>
          </div>

          {/* Notice Alert Box */}
          <div className="mt-5 mb-4 p-3.5 bg-blue-50/70 border border-blue-100 rounded-md flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
            <span className="material-symbols-outlined text-blue-600 text-[18px] mt-0.5 shrink-0">
              info
            </span>
            <div>
              Notice: Only active MMSU faculty, researchers, and students with verified institutional credentials can register (<span className="font-mono font-medium text-slate-800">@mmsu.edu.ph</span>).
            </div>
          </div>

          {/* Registration Form */}
          <form className="space-y-3.5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
                <span className="material-symbols-outlined text-red-500 text-[18px] shrink-0 mt-0.5">
                  error
                </span>
                <div className="flex-1 font-medium">{error}</div>
              </div>
            )}

            {/* Full Name */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700" htmlFor="fullname">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">Format: First Name, M.I., Last Name</span>
              </div>
              <input
                id="fullname"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Maria C. Reyes"
                className="w-full h-10 px-3.5 bg-white border border-slate-300 rounded text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b] transition-colors"
              />
            </div>

            {/* Category & College Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Researcher Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="category">
                  Researcher Category <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="category"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3.5 pr-8 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b] appearance-none cursor-pointer"
                  >
                    <option value="" disabled>
                      Select Category
                    </option>
                    <option value="faculty">Faculty Researcher</option>
                    <option value="student">Student Researcher</option>
                    <option value="graduate">Graduate Student</option>
                    <option value="external">External Researcher</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-2.5 pointer-events-none text-slate-400 text-base">
                    expand_more
                  </span>
                </div>
              </div>

              {/* Academic Unit */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="unit">
                  College / Academic Unit <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="unit"
                    required
                    value={academicUnit}
                    onChange={(e) => setAcademicUnit(e.target.value)}
                    className="w-full h-10 px-3.5 pr-8 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b] appearance-none cursor-pointer"
                  >
                    <option value="" disabled>
                      Select College / Unit
                    </option>
                    <option value="cafsd">College of Agriculture, Food and Sustainable Development (CAFSD)</option>
                    <option value="cas">College of Arts and Sciences (CAS)</option>
                    <option value="cbae">College of Business, Accountancy and Economics (CBAE)</option>
                    <option value="coe">College of Engineering (COE)</option>
                    <option value="chs">College of Health Sciences (CHS)</option>
                    <option value="cte">College of Teacher Education (CTE)</option>
                    <option value="gs">Graduate School</option>
                    <option value="external">External / Other Affiliate</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-2.5 pointer-events-none text-slate-400 text-base">
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* Institutional Email */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700" htmlFor="reg-email">
                  MMSU Institutional Email <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">Must be a valid @mmsu.edu.ph address</span>
              </div>
              <div className="relative">
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="username@mmsu.edu.ph"
                  className="w-full h-10 pl-3.5 pr-9 bg-white border border-slate-300 rounded text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b] transition-colors"
                />
                <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-slate-400 text-base pointer-events-none">
                  mail
                </span>
              </div>
            </div>

            {/* Password & Confirm Password Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="reg-password">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Min. 6 chars</span>
                </div>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 pl-3.5 pr-9 bg-white border border-slate-300 rounded text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="material-symbols-outlined absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer text-base select-none"
                    title="Toggle visibility"
                  >
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="reg-confirm-password">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Must match</span>
                </div>
                <div className="relative">
                  <input
                    id="reg-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 pl-3.5 pr-9 bg-white border border-slate-300 rounded text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="material-symbols-outlined absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer text-base select-none"
                    title="Toggle visibility"
                  >
                    {showConfirmPassword ? 'visibility' : 'visibility_off'}
                  </button>
                </div>
              </div>
            </div>

            {/* Checkbox / Terms */}
            <div className="p-3 bg-slate-50 rounded border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600 leading-normal">
              <input
                id="terms"
                type="checkbox"
                required
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-[#1e513b] focus:ring-[#1e513b] accent-[#1e513b]"
              />
              <label htmlFor="terms" className="cursor-pointer select-none text-[11px] sm:text-xs text-slate-600">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent('urerb_open_footer_modal', { detail: 'ethics' }));
                  }}
                  className="underline font-medium text-slate-800 hover:text-[#1e513b] cursor-pointer"
                >
                  MMSU Research Ethics Guidelines
                </button>{' '}
                and the{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent('urerb_open_footer_modal', { detail: 'privacy' }));
                  }}
                  className="underline font-medium text-slate-800 hover:text-[#1e513b] cursor-pointer"
                >
                  Data Privacy Act of 2012
                </button>
                .
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-2.5 px-4 bg-[#1e513b] hover:bg-[#163f2e] text-white font-medium text-xs sm:text-sm rounded-md shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-[#163f2e] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Creating Account...</span>
                </div>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                  <span>Register Researcher Account</span>
                </>
              )}
            </button>

            {/* Sign In Link */}
            <div className="pt-1.5 text-center text-xs text-slate-500">
              Already have an account?{' '}
              <Link
                to={ROUTES.AUTH.LOGIN}
                className="font-semibold text-slate-800 hover:text-[#1e513b] hover:underline ml-1"
              >
                Sign In
              </Link>
            </div>
          </form>
        </div>

        {/* Security Stamp */}
        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] font-mono text-slate-400">
          <span>SYSTEM NODE: AUTH-02</span>
          <span>•</span>
          <span>SECURE CONNECTION (TLS 1.3)</span>
        </div>
      </div>
    </AuthLayout>
  );
}
