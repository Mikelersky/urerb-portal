import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../../utils/auth';
import { notificationsApi } from '../../services/api';
import { ROUTES } from '../../constants/routes';

export default function Header({
  roleName = "Researcher",
  userName = "Researcher",
  userSubtitle = "",
  unreadNotificationsCount,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(getCurrentUser);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(typeof unreadNotificationsCount === 'number' ? unreadNotificationsCount : 0);
  const dropdownRef = useRef(null);

  const isNotificationsActive = location.pathname === ROUTES.RESEARCHER.NOTIFICATIONS;

  useEffect(() => {
    if (typeof unreadNotificationsCount === 'number') {
      setUnreadCount(unreadNotificationsCount);
    }
  }, [unreadNotificationsCount]);

  useEffect(() => {
    const fetchUnread = () => {
      notificationsApi.list()
        .then((res) => {
          if (res && typeof res.unreadCount === 'number') {
            setUnreadCount(res.unreadCount);
          }
        })
        .catch(() => {});
    };

    fetchUnread();

    const handleSync = () => {
      setCurrentUser(getCurrentUser());
      fetchUnread();
    };

    window.addEventListener('urerb_auth_sync', handleSync);
    window.addEventListener('urerb_notif_sync', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('urerb_auth_sync', handleSync);
      window.removeEventListener('urerb_notif_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await logout();
    setShowDropdown(false);
    navigate(ROUTES.AUTH.LOGIN);
  };

  const displayName = currentUser?.fullName || currentUser?.name || userName;
  const displaySubtitle = currentUser?.title || currentUser?.userRole || userSubtitle;
  const computedInitials = displayName
    ? displayName
        .replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+/i, '')
        .split(/\s+/)
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'RS';
  const displayInitials = currentUser?.initials || computedInitials || 'RS';

  return (
    <header className="h-16 shrink-0 z-30 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between shadow-xs select-none">
      {/* Left: MMSU Seal & Portal Identification */}
      <div className="flex items-center gap-3.5">
        <Link to="/researcher/dashboard" className="flex items-center gap-3 group">
          <img
            src="/logos/mmsu-seal.png"
            alt="Mariano Marcos State University Seal"
            className="h-10 w-auto object-contain shrink-0"
          />
          <div className="h-8 w-px bg-slate-200"></div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tracking-tight text-base">
                URERB Portal
              </span>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-medium">
                HCI Protocol v2.5
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-tight">
              University Research Ethics Review Board · Mariano Marcos State University
            </p>
          </div>
        </Link>
      </div>

      {/* Right: Notifications Bell + User Identification & Avatar Dropdown */}
      <div className="relative flex items-center gap-3 sm:gap-4" ref={dropdownRef}>
        {/* Notifications Bell Link */}
        <Link
          to={ROUTES.RESEARCHER.NOTIFICATIONS}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors relative cursor-pointer ${
            isNotificationsActive
              ? 'bg-[#1e513b] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Researcher notifications"
        >
          <span className="material-symbols-outlined text-[20px]">
            notifications
          </span>
          {unreadCount > 0 && (
            <span
              className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full ring-2 ${
                isNotificationsActive
                  ? 'bg-amber-400 ring-[#1e513b]'
                  : 'bg-rose-600 ring-white animate-pulse'
              }`}
            ></span>
          )}
        </Link>

        <div className="text-right hidden sm:block">
          <div className="text-sm font-semibold text-slate-800 leading-tight">
            {displayName}
          </div>
          {displaySubtitle && (
            <div className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
              {displaySubtitle}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-9 h-9 rounded-full bg-[#1e513b] hover:bg-[#163f2e] text-white flex items-center justify-center font-bold text-xs shadow-xs transition-colors shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1e513b] focus:ring-offset-2"
          title="Account Menu"
          aria-expanded={showDropdown}
        >
          <span>{displayInitials}</span>
        </button>

        {/* Profile Dropdown Menu */}
        {showDropdown && (
          <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 text-xs animate-in fade-in duration-150 space-y-3">
            <div className="pb-2 border-b border-slate-100">
              <div className="font-bold text-slate-900">{displayName}</div>
              <div className="text-[11px] text-slate-500 truncate">{displaySubtitle}</div>
              {currentUser?.email && (
                <div className="text-[10px] font-mono text-slate-400 mt-1 truncate">
                  {currentUser.email}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Link
                to={ROUTES.RESEARCHER.PROFILE}
                onClick={() => setShowDropdown(false)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-slate-400">
                  account_circle
                </span>
                <span>My Profile</span>
              </Link>
              <Link
                to={ROUTES.RESEARCHER.HELP_CENTER}
                onClick={() => setShowDropdown(false)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-slate-400">
                  help_outline
                </span>
                <span>Help Center</span>
              </Link>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors font-medium cursor-pointer text-left"
              >
                <span className="material-symbols-outlined text-[18px]">
                  logout
                </span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
