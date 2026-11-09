import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ResearcherLayout from '../../layouts/ResearcherLayout';
import { ROUTES } from '../../constants/routes';
import { getCurrentUser, updateUserProfile, changePassword } from '../../utils/auth';
import { protocolsApi } from '../../services/api';

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'RS';
  const cleaned = name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/i, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (!parts.length) return 'RS';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export default function Profile() {
  const [profile, setProfile] = useState(() => {
    const active = getCurrentUser() || {};
    return {
      ...active,
      initials: getInitials(active.fullName || active.name || 'Researcher'),
    };
  });
  const [protocolCount, setProtocolCount] = useState(0);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactNumber, setContactNumber] = useState(profile.contactNumber || '');
  const [office, setOffice] = useState(profile.office || '');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);

  // Change Password Modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    async function loadCount() {
      try {
        const res = await protocolsApi.list();
        if (res && res.success && Array.isArray(res.protocols)) {
          setProtocolCount(res.protocols.length);
        }
      } catch (err) {
        console.warn('Failed to fetch protocol count:', err);
      }
    }
    loadCount();
  }, []);

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

    setIsChangingPassword(true);
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
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveContact = async () => {
    setIsSavingContact(true);
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
    } finally {
      setIsSavingContact(false);
    }
  };

  return (
    <ResearcherLayout>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-slate-500 font-medium select-none">
        <Link to={ROUTES.RESEARCHER.DASHBOARD} className="hover:text-slate-800 flex items-center transition-colors">
          <span className="material-symbols-outlined text-[16px] mr-1 text-slate-400">home</span>
          <span>Home</span>
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold">Profile</span>
      </nav>

      {/* Header Profile Title Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Profile</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            View and manage your researcher account information.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-[#1e513b] transition shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5 text-slate-500">
              lock_reset
            </span>
            <span>Change Password</span>
          </button>
          <button
            type="button"
            onClick={() => setIsEditingContact(!isEditingContact)}
            className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-[#1e513b] transition shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5 text-slate-500">
              {isEditingContact ? 'close' : 'edit'}
            </span>
            <span>{isEditingContact ? 'Cancel Editing' : 'Edit Profile'}</span>
          </button>
        </div>
      </div>

      {saveSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#1e513b]">check_circle</span>
          <span>Contact information updated successfully.</span>
        </div>
      )}

      {/* Main Details Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        {/* Profile User Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-[#1e513b] text-white flex items-center justify-center text-xl font-bold shadow-xs ring-4 ring-emerald-50 shrink-0">
              {profile.initials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 leading-tight">
                  {profile.name || profile.fullName || 'Researcher'}
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5 animate-pulse" />
                  {profile.status || 'Active'}
                </span>
              </div>
              {profile.title && (
                <p className="text-xs text-slate-600 mt-1 font-medium">{profile.title}</p>
              )}
              {profile.email && (
                <p className="text-xs font-mono text-slate-500 mt-0.5 flex items-center">
                  <span className="material-symbols-outlined text-[15px] mr-1 text-slate-400">mail</span>
                  <span>{profile.email}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Profile Grid (2 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          {/* Full Name */}
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Full Name
            </span>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 flex items-center justify-between">
              <span>{profile.fullName || profile.name || '—'}</span>
              {(profile.fullName || profile.name) && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Verified
                </span>
              )}
            </div>
          </div>

          {/* Institutional Email */}
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Institutional Email
            </span>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-mono text-slate-800 flex items-center justify-between">
              <span>{profile.email || '—'}</span>
              {profile.email && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center">
                  <span className="material-symbols-outlined text-[14px] mr-1">lock</span>
                  Institutional Verified
                </span>
              )}
            </div>
          </div>

          {/* Researcher ID */}
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Researcher ID / Employee ID
            </span>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-mono text-slate-800">
              {profile.researcherId || profile.idNumber || '—'}
            </div>
          </div>

          {/* User Role */}
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              User Role
            </span>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium text-slate-800">
              {profile.userRole || 'Researcher'}
            </div>
          </div>

          {/* College */}
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              College / Academic Unit
            </span>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium text-slate-800">
              {profile.college || '—'}
            </div>
          </div>

          {/* Department */}
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Department
            </span>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium text-slate-800">
              {profile.department || '—'}
            </div>
          </div>

          {/* Contact Number */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Contact Number
              </span>
              <span className="text-[11px] text-emerald-700 font-medium">Editable</span>
            </div>
            {isEditingContact ? (
              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="Enter contact number..."
                className="w-full p-2.5 bg-white rounded-lg border border-[#1e513b] text-sm font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e513b]"
              />
            ) : (
              <div className="p-3 bg-white rounded-lg border border-slate-300 text-sm font-medium text-slate-800 flex items-center justify-between">
                <span className="font-mono">{profile.contactNumber || 'Not provided'}</span>
                <span className="material-symbols-outlined text-[16px] text-slate-400">edit</span>
              </div>
            )}
          </div>

          {/* Alternate Contact / Office */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Alternate Contact / Office
              </span>
              <span className="text-[11px] text-emerald-700 font-medium">Editable</span>
            </div>
            {isEditingContact ? (
              <input
                type="text"
                value={office}
                onChange={(e) => setOffice(e.target.value)}
                placeholder="Enter office or room location..."
                className="w-full p-2.5 bg-white rounded-lg border border-[#1e513b] text-sm font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e513b]"
              />
            ) : (
              <div className="p-3 bg-white rounded-lg border border-slate-300 text-sm font-medium text-slate-800 flex items-center justify-between">
                <span>{profile.office || 'Not provided'}</span>
                <span className="material-symbols-outlined text-[16px] text-slate-400">edit</span>
              </div>
            )}
          </div>
        </div>

        {isEditingContact && (
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditingContact(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveContact}
              className="px-4 py-2 bg-[#1e513b] text-white rounded-lg text-xs font-semibold hover:bg-[#163f2e]"
            >
              Save Changes
            </button>
          </div>
        )}

        {/* Institutional Directory Notice */}
        <div className="mt-6 p-3 bg-indigo-50/70 rounded-lg border border-indigo-100 flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
          <span className="material-symbols-outlined text-[18px] text-indigo-700 shrink-0 mt-0.5">
            info
          </span>
          <span>
            Institutional email, Researcher ID, and academic affiliation are verified via the MMSU HRIS directory and require Secretariat approval to modify.
          </span>
        </div>
      </div>

      {/* Account & Security Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-4 flex items-center">
          <span className="w-2 h-2 rounded-full bg-[#1e513b] mr-2" />
          Account &amp; Security
        </h3>
        <div className="divide-y divide-slate-100">
          <div className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0">
            <div className="max-w-xl">
              <div className="text-sm font-semibold text-slate-900">Account Password</div>
              <p className="text-xs text-slate-500 mt-0.5">
                Update your password regularly to maintain account security.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-[#1e513b] transition self-start sm:self-center shadow-xs cursor-pointer"
            >
              Change Password
            </button>
          </div>
        </div>
      </div>

      {/* Account Activity Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-4 flex items-center">
          <span className="w-2 h-2 rounded-full bg-[#1e513b] mr-2" />
          Account Activity
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-xs text-slate-500 font-medium">Last Login</div>
            <div className="text-sm font-semibold text-slate-900 mt-1">
              {profile.lastLogin || 'Current session'}
            </div>
            {profile.ip && (
              <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                IP: {profile.ip}
              </p>
            )}
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-xs text-slate-500 font-medium">Account Created</div>
            <div className="text-sm font-semibold text-slate-900 mt-1">
              {profile.accountCreated || '—'}
            </div>
            {profile.accountCreated && (
              <p className="text-[11px] text-emerald-700 mt-0.5 font-medium flex items-center">
                <span className="material-symbols-outlined text-[14px] mr-1">check</span>
                Active URERB Account
              </p>
            )}
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-xs text-slate-500 font-medium">Active Ethics Protocols</div>
            <div className="text-sm font-semibold text-slate-900 mt-1">
              {protocolCount} {protocolCount === 1 ? 'Application' : 'Applications'}
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              {protocolCount === 0 ? 'No active submissions yet' : `${protocolCount} total registered`}
            </p>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1e513b]">lock_reset</span>
                <h3 className="font-bold text-slate-900 text-base">Change Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {passwordSuccess ? (
              <div className="py-6 text-center space-y-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[28px]">check</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Password Updated Successfully</h4>
                <p className="text-xs text-slate-500">Your new password is now active.</p>
              </div>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-3.5 text-xs">
                {passwordError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700 font-medium">
                    {passwordError}
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
                    placeholder="••••••••"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-[#1e513b]"
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
                    placeholder="••••••••"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-[#1e513b]"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Minimum 6 characters</span>
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
                    placeholder="••••••••"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-[#1e513b]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#1e513b] hover:bg-[#163f2e] text-white rounded-lg font-semibold cursor-pointer shadow-xs"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </ResearcherLayout>
  );
}
