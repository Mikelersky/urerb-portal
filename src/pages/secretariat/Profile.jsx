import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SecretariatLayout from '../../layouts/SecretariatLayout';
import { ROUTES } from '../../constants/routes';
import { getCurrentUser, updateUserProfile, changePassword } from '../../utils/auth';
import { checkingApi } from '../../services/api';

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'SO';
  const cleaned = name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/i, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (!parts.length) return 'SO';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export default function SecretariatProfile() {
  const [profile, setProfile] = useState(() => {
    const active = getCurrentUser() || {};
    const name = active.fullName || active.name || 'Secretariat Officer';
    return {
      name,
      title: active.title || 'Institutional Ethics Review Secretariat Officer',
      email: active.email || 'secretariat@mmsu.edu.ph',
      initials: active.initials || getInitials(name),
      desk: active.desk || 'Secretariat Desk A',
      officerId: active.officerId || active.researcherId || `SEC-${active.id || '01'}`,
      status: 'Active Secretariat Officer',
      unit: active.college || 'Office of the Vice President for Research, Extension & Business (OVPREB)',
      department: active.department || 'University Research Ethics Review Board (URERB) Secretariat',
      accreditationRole: active.accreditationRole || 'Intake & Docket Coordinator',
      contactNumber: active.contactNumber || '',
      office: active.office || '',
      appointmentDate: active.accountCreated || 'Active',
      lastLogin: active.lastLogin || 'Current session',
      ip: active.ip || '',
    };
  });

  const [metrics, setMetrics] = useState({
    activeReviews: 0,
    decisionsCompleted: 0,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await checkingApi.queue();
        if (res && res.success && res.metrics) {
          setMetrics({
            activeReviews: res.metrics.activeReviews || 0,
            decisionsCompleted: res.metrics.totalCompleted || 0,
          });
        }
      } catch (err) {
        console.warn('Failed to load secretariat profile metrics:', err);
      }
    }
    loadStats();
  }, []);

  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactNumber, setContactNumber] = useState(profile.contactNumber);
  const [office, setOffice] = useState(profile.office);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);

  // Change Password Modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleSaveContact = async () => {
    try {
      const updated = await updateUserProfile({ contactNumber, office });
      setProfile((prev) => ({
        ...prev,
        contactNumber,
        office,
        ...(updated || {}),
      }));
      setIsEditingContact(false);
      setSaveSuccessMessage(true);
      setTimeout(() => setSaveSuccessMessage(false), 3000);
    } catch (err) {
      alert(err.message || 'Failed to update contact info on server.');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    try {
      const res = await changePassword(oldPassword, newPassword, confirmPassword);
      if (res && res.success) {
        setPasswordSuccess(true);
        setTimeout(() => {
          setPasswordSuccess(false);
          setShowPasswordModal(false);
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }, 1800);
      } else {
        setPasswordError(res?.message || 'Password update failed.');
      }
    } catch (err) {
      setPasswordError(err.message || 'Password update failed. Verify your current password.');
    }
  };

  return (
    <SecretariatLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center space-x-2 text-xs text-slate-500 font-medium select-none"
        >
          <Link
            to={ROUTES.SECRETARIAT.DASHBOARD}
            className="hover:text-slate-800 flex items-center transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] mr-1 text-slate-400">
              home
            </span>
            <span>Secretariat Workspace</span>
          </Link>
          <span>/</span>
          <span className="text-[#14432f] font-semibold">
            Secretariat Profile
          </span>
        </nav>

        {/* Header Card */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#14432f] text-white flex items-center justify-center font-bold text-xl shadow-sm shrink-0">
              {profile.initials}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {profile.name}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#d1fae5] text-[#065f46]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#065f46]"></span>
                  {profile.status}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                {profile.title}
                {profile.desk ? ` · Desk ${profile.desk}` : ''}
                {profile.officerId ? ` (${profile.officerId})` : ''}
              </p>
              {profile.email && (
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  {profile.email}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">
                lock_reset
              </span>
              <span>Change Password</span>
            </button>
          </div>
        </div>

        {saveSuccessMessage && (
          <div className="p-3.5 rounded-xl bg-[#d1fae5] border border-emerald-300 text-[#065f46] text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              check_circle
            </span>
            <span>Secretariat desk contact details updated successfully.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Institutional Appointment & Responsibilities */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <span className="material-symbols-outlined text-[19px] text-[#14432f]">
                  badge
                </span>
                <h2 className="text-sm font-bold text-slate-900">
                  Institutional Appointment &amp; Desk Assignment
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    OFFICER ID
                  </span>
                  <span className="font-mono font-bold text-slate-900 mt-1 block">
                    {profile.officerId || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    ASSIGNED DESK
                  </span>
                  <span className="font-mono font-bold text-[#14432f] mt-1 block">
                    {profile.desk ? `Desk ${profile.desk} — Intake & Routing` : 'Intake & Routing Desk'}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    OFFICE / DIVISION
                  </span>
                  <span className="font-semibold text-slate-900 mt-1 block">
                    {profile.department}
                  </span>
                  <span className="text-slate-500 mt-0.5 block">
                    {profile.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    PHREB ACCREDITATION ROLE
                  </span>
                  <span className="font-medium text-slate-800 mt-1 block">
                    {profile.accreditationRole}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    APPOINTMENT DATE
                  </span>
                  <span className="font-medium text-slate-800 mt-1 block">
                    {profile.appointmentDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact & Office Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[19px] text-[#14432f]">
                    contact_mail
                  </span>
                  <h2 className="text-sm font-bold text-slate-900">
                    Desk Contact &amp; Location
                  </h2>
                </div>
                {!isEditingContact ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingContact(true)}
                    className="text-xs font-semibold text-[#14432f] hover:underline cursor-pointer"
                  >
                    Edit Details
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingContact(false);
                        setContactNumber(profile.contactNumber);
                        setOffice(profile.office);
                      }}
                      className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveContact}
                      className="px-3 py-1 rounded-lg bg-[#14432f] text-white text-xs font-semibold hover:bg-[#0f3323] cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    INSTITUTIONAL EMAIL
                  </label>
                  <div className="font-mono text-slate-800">{profile.email || '—'}</div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    DIRECT CONTACT / LOCAL LINE
                  </label>
                  {isEditingContact ? (
                    <input
                      type="text"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      placeholder="Enter contact number..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-[#14432f]"
                    />
                  ) : (
                    <div className="font-medium text-slate-800">
                      {profile.contactNumber || 'Not provided'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    PHYSICAL VAULT &amp; SECRETARIAT OFFICE
                  </label>
                  {isEditingContact ? (
                    <input
                      type="text"
                      value={office}
                      onChange={(e) => setOffice(e.target.value)}
                      placeholder="Enter office location..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-[#14432f]"
                    />
                  ) : (
                    <div className="font-medium text-slate-800">
                      {profile.office || 'Not provided'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Security & Workload Summary */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <span className="material-symbols-outlined text-[19px] text-[#14432f]">
                  analytics
                </span>
                <h2 className="text-sm font-bold text-slate-900">
                  Secretariat Desk Metrics
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#f4f6fb] border border-slate-200/70">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    INTAKE QUEUE
                  </div>
                  <div className="text-2xl font-extrabold text-[#14432f] mt-1">
                    {String(metrics.activeReviews || 0).padStart(2, '0')}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Active submissions
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#f4f6fb] border border-slate-200/70">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    ARCHIVED LEDGER
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">
                    {metrics.decisionsCompleted || 0}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Retained records
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-2xs space-y-3 text-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="material-symbols-outlined text-[19px] text-[#14432f]">
                  security
                </span>
                <h2 className="text-sm font-bold text-slate-900">
                  Session &amp; Audit Security
                </h2>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Last Sign-In</span>
                <span className="font-mono font-semibold text-slate-800">
                  {profile.lastLogin}
                </span>
              </div>
              {profile.ip && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Network Node</span>
                  <span className="font-mono text-slate-700">{profile.ip}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Vault Clearance</span>
                <span className="font-mono font-semibold text-[#14432f]">
                  PHREB SOP-09 Level 2
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#14432f]">
                  lock_reset
                </span>
                <h3 className="font-bold text-slate-900 text-base">
                  Update Secretariat Password
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-3.5 text-xs">
              {passwordError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 font-medium">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                  Password updated successfully!
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-[#14432f]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-[#14432f]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-[#14432f]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white font-semibold cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SecretariatLayout>
  );
}

