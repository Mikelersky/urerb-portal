import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import Footer from '../components/layout/Footer';
import { getCurrentUser, logout } from '../utils/auth';
import { checkingApi, notificationsApi } from '../services/api';

const DEFAULT_SEC_PROFILE = {
  name: 'Maria Santos, MSPH',
  role: 'Secretariat Officer',
  desk: 'SEC-04',
  email: 'secretariat@mmsu.edu.ph',
};

export default function SecretariatLayout({
  children,
  showApplicationsBadge = true,
  unreadNotificationsCount,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(getCurrentUser);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSopModal, setShowSopModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const dropdownRef = useRef(null);
  const [newSubmissionsCount, setNewSubmissionsCount] = useState(0);

  const [unreadNotifs, setUnreadNotifs] = useState(
    typeof unreadNotificationsCount === 'number' ? unreadNotificationsCount : 0
  );

  useEffect(() => {
    if (typeof unreadNotificationsCount === 'number') {
      setUnreadNotifs(unreadNotificationsCount);
    }
  }, [unreadNotificationsCount]);

  useEffect(() => {
    const fetchQueueAndNotifs = () => {
      checkingApi.queue()
        .then((res) => {
          if (res && res.metrics) {
            setNewSubmissionsCount(res.metrics.intakeChecking || res.metrics.totalProtocols || 0);
          }
        })
        .catch(() => {});

      notificationsApi.list()
        .then((res) => {
          if (res && typeof res.unreadCount === 'number') {
            setUnreadNotifs(res.unreadCount);
          }
        })
        .catch(() => {});
    };

    fetchQueueAndNotifs();

    const handleSync = () => {
      setCurrentUser(getCurrentUser());
      fetchQueueAndNotifs();
    };

    window.addEventListener('urerb_auth_sync', handleSync);
    window.addEventListener('urerb_secretariat_sync', handleSync);
    window.addEventListener('urerb_secretariat_notif_sync', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('urerb_auth_sync', handleSync);
      window.removeEventListener('urerb_secretariat_sync', handleSync);
      window.removeEventListener('urerb_secretariat_notif_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isRouteActive = (path) => {
    return location.pathname === path;
  };

  const navLinkClass = (path) => {
    const active = isRouteActive(path);
    if (active) {
      return 'flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#14432f] text-white font-semibold text-xs sm:text-[13px] shadow-xs transition-colors';
    }
    return 'flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium text-xs sm:text-[13px] transition-colors group';
  };

  const getIconClass = (path) => {
    return isRouteActive(path)
      ? 'text-white'
      : 'text-slate-400 group-hover:text-slate-600';
  };

  const displayName =
    currentUser?.name || currentUser?.fullName || DEFAULT_SEC_PROFILE.name;
  const displayTitle =
    currentUser?.title || DEFAULT_SEC_PROFILE.role;
  const displayDesk =
    currentUser?.desk || DEFAULT_SEC_PROFILE.desk;
  const displayEmail =
    currentUser?.email || DEFAULT_SEC_PROFILE.email;

  const handleSignOut = async () => {
    await logout();
    setShowProfileMenu(false);
    navigate(ROUTES.AUTH.LOGIN);
  };

  return (
    <div className="h-screen w-full flex flex-col bg-[#faf8ff] text-slate-800 font-sans antialiased overflow-hidden selection:bg-[#14432f]/10 selection:text-[#14432f]">
      {/* Top Pinned Header */}
      <header className="h-16 shrink-0 z-30 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between shadow-2xs select-none relative">
        {/* Left: MMSU Seal & Portal Identification */}
        <Link to={ROUTES.SECRETARIAT.DASHBOARD} className="flex items-center gap-3.5 group">
          <img
            src="/logos/mmsu-seal.png"
            alt="Mariano Marcos State University Seal"
            className="h-10 w-auto object-contain shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tracking-tight text-base">
                URERB Portal
              </span>
              <span className="text-[10px] font-mono bg-[#e8ecfb] text-[#3b4cca] px-2 py-0.5 rounded-full font-semibold">
                v2.5
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-tight">
              Mariano Marcos State University · Ethics Review Board
            </p>
          </div>
        </Link>

        {/* Right: Notifications Bell + Secretariat Officer Identity & Dropdown */}
        <div className="flex items-center gap-3 sm:gap-4" ref={dropdownRef}>
          {/* Notifications Bell Link */}
          <Link
            to={ROUTES.SECRETARIAT.NOTIFICATIONS}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors relative cursor-pointer ${
              isRouteActive(ROUTES.SECRETARIAT.NOTIFICATIONS)
                ? 'bg-[#14432f] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Secretariat notifications"
          >
            <span className="material-symbols-outlined text-[20px]">
              notifications
            </span>
            {unreadNotifs > 0 && (
              <span
                className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full ring-2 ${
                  isRouteActive(ROUTES.SECRETARIAT.NOTIFICATIONS)
                    ? 'bg-amber-400 ring-[#14432f]'
                    : 'bg-rose-600 ring-white animate-pulse'
                }`}
              ></span>
            )}
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 cursor-pointer group focus:outline-none"
            >
              <div className="text-right hidden sm:block">
                <div className="text-xs sm:text-sm font-bold text-slate-900 leading-tight group-hover:text-[#14432f] transition-colors">
                  {displayName}
                </div>
                <div className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                  {displayTitle}
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#14432f] text-white flex items-center justify-center shadow-xs shrink-0 ring-2 ring-emerald-700/20 group-hover:ring-[#14432f]/40 transition-all">
                <span className="material-symbols-outlined text-[19px]">person</span>
              </div>
            </button>

            {/* Profile Menu Popover */}
            {showProfileMenu && (
              <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 text-xs animate-in fade-in duration-150 space-y-2.5">
                <div className="pb-2.5 border-b border-slate-100">
                  <div className="font-bold text-slate-900">{displayName}</div>
                  <div className="text-[11px] text-slate-500">
                    {displayTitle}
                    {displayDesk ? ` · Desk ${displayDesk}` : ''}
                  </div>
                  {displayEmail && (
                    <div className="text-[10px] font-mono text-slate-400 mt-1 truncate">
                      {displayEmail}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Link
                    to={ROUTES.SECRETARIAT.PROFILE}
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-slate-400">
                      account_circle
                    </span>
                    <span>My Profile</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowSopModal(true);
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer text-left"
                  >
                    <span className="material-symbols-outlined text-[18px] text-slate-400">
                      menu_book
                    </span>
                    <span>Secretariat SOP Guidelines</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowSupportModal(true);
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer text-left"
                  >
                    <span className="material-symbols-outlined text-[18px] text-slate-400">
                      help_outline
                    </span>
                    <span>Secretariat Support</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors font-semibold cursor-pointer text-left"
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
        </div>
      </header>

      {/* Middle Work Area: Left Sidebar + Main Scrollable Content */}
      <div className="flex-1 min-h-0 flex overflow-hidden w-full">
        {/* Left Sidebar Navigation */}
        <aside className="w-64 shrink-0 h-full bg-white border-r border-slate-200 flex flex-col justify-between p-4 overflow-y-auto select-none">
          <div className="space-y-6">
            {/* Workspace Heading */}
            <div className="pb-2 border-b border-slate-100">
              <div className="px-3 text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">
                ETHICS NAVIGATION
              </div>
              <div className="px-3 text-sm font-bold text-slate-900">
                Secretariat Workspace
              </div>
            </div>

            {/* Section: Main Workspace */}
            <div className="space-y-1">
              <span className="px-3 text-[11px] font-bold tracking-wider text-slate-400 mb-1.5 block uppercase">
                MAIN WORKSPACE
              </span>
              <nav className="space-y-1">
                <NavLink
                  to={ROUTES.SECRETARIAT.DASHBOARD}
                  className={navLinkClass(ROUTES.SECRETARIAT.DASHBOARD)}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`material-symbols-outlined text-[18px] ${getIconClass(
                        ROUTES.SECRETARIAT.DASHBOARD
                      )}`}
                    >
                      grid_view
                    </span>
                    <span>Secretariat Dashboard</span>
                  </div>
                </NavLink>

                <NavLink
                  to={ROUTES.SECRETARIAT.APPLICATIONS_MANAGEMENT}
                  className={navLinkClass(ROUTES.SECRETARIAT.APPLICATIONS_MANAGEMENT)}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`material-symbols-outlined text-[18px] ${getIconClass(
                        ROUTES.SECRETARIAT.APPLICATIONS_MANAGEMENT
                      )}`}
                    >
                      inventory_2
                    </span>
                    <span>Applications</span>
                  </div>
                  {showApplicationsBadge && newSubmissionsCount > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                        isRouteActive(ROUTES.SECRETARIAT.APPLICATIONS_MANAGEMENT)
                          ? 'bg-white/20 text-white'
                          : 'bg-[#e8ecfb] text-[#3b4cca]'
                      }`}
                    >
                      {String(newSubmissionsCount).padStart(2, '0')}
                    </span>
                  )}
                </NavLink>

                <NavLink
                  to={ROUTES.SECRETARIAT.APPLICATION_CHECKING}
                  className={navLinkClass(ROUTES.SECRETARIAT.APPLICATION_CHECKING)}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`material-symbols-outlined text-[18px] ${getIconClass(
                        ROUTES.SECRETARIAT.APPLICATION_CHECKING
                      )}`}
                    >
                      fact_check
                    </span>
                    <span>Application Checking</span>
                  </div>
                </NavLink>

                <NavLink
                  to={ROUTES.SECRETARIAT.APPLICATION_PROCESSING}
                  className={navLinkClass(ROUTES.SECRETARIAT.APPLICATION_PROCESSING)}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`material-symbols-outlined text-[18px] shrink-0 ${getIconClass(
                        ROUTES.SECRETARIAT.APPLICATION_PROCESSING
                      )}`}
                    >
                      assignment_turned_in
                    </span>
                    <span className="leading-snug">
                      Application Details /
                      <br />
                      Processing
                    </span>
                  </div>
                </NavLink>

                <NavLink
                  to={ROUTES.SECRETARIAT.RECORDS_AND_ARCHIVES}
                  className={navLinkClass(ROUTES.SECRETARIAT.RECORDS_AND_ARCHIVES)}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`material-symbols-outlined text-[18px] ${getIconClass(
                        ROUTES.SECRETARIAT.RECORDS_AND_ARCHIVES
                      )}`}
                    >
                      folder_open
                    </span>
                    <span>Records</span>
                  </div>
                </NavLink>
              </nav>
            </div>

            {/* Section: Support & Account */}
            <div className="space-y-1">
              <span className="px-3 text-[11px] font-bold tracking-wider text-slate-400 mb-1.5 block uppercase">
                SUPPORT &amp; ACCOUNT
              </span>
              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => setShowSopModal(true)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium text-xs sm:text-[13px] transition-colors cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-slate-600">
                      menu_book
                    </span>
                    <span>Secretariat Guidelines</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSupportModal(true)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium text-xs sm:text-[13px] transition-colors cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-slate-600">
                      help_outline
                    </span>
                    <span>Secretariat Support</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 font-medium text-xs sm:text-[13px] transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-rose-500">
                      logout
                    </span>
                    <span>Sign Out</span>
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Bottom Secretariat Protocol Compliance Box */}
          <div className="pt-4 border-t border-slate-100">
            <div className="p-3 bg-[#f3f5fb] border border-slate-200/90 rounded-lg flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[#14432f]">
                <span className="material-symbols-outlined text-[15px]">
                  verified_user
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  SECRETARIAT PROTOCOL
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                PHREB Level 2 Accreditation · Verify Form 15, Form 16, &amp; O.R. fee compliance within 3 working days.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content Canvas */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto overflow-x-hidden p-6 md:p-8 pb-12 bg-[#faf8ff]">
          <div className="max-w-6xl w-full mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Institutional Fixed Footer */}
      <Footer />

      {/* Secretariat SOP Guidelines Modal */}
      {showSopModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#14432f]">menu_book</span>
                <h3 className="font-bold text-slate-900 text-base">URERB Secretariat Intake SOP</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSopModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                <strong>PHREB Level 2 Standard (SOP-04 &amp; SOP-09):</strong> Initial administrative screening of submitted protocols must be completed within 3 working days of receipt.
              </p>
              <div className="p-3.5 bg-[#f4f6fb] rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="font-bold text-slate-800">Mandatory Verification Checklist:</div>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Form 15 &amp; Form 14:</strong> Verify Principal Investigator endorsement and assessment signatures.</li>
                  <li><strong>Form 16:</strong> Confirm dual-language Informed Consent (English &amp; Ilocano) attachments.</li>
                  <li><strong>Form 13 &amp; Form 17:</strong> Check study team GCP certificates and non-clinical methodology.</li>
                  <li><strong>Official Receipt (O.R.):</strong> Validate Cashier review fee receipt before routing to Panel Chairs.</li>
                </ul>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSopModal(false)}
                className="px-4 py-2 bg-[#14432f] hover:bg-[#0f3323] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secretariat Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#14432f]">help</span>
                <h3 className="font-bold text-slate-900 text-base">Secretariat &amp; System Support</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                For technical assistance with docket synchronization, PHREB digital vault archiving, or panel chair assignments:
              </p>
              <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 space-y-1.5 text-emerald-950">
                <p><strong>URERB Chair Office:</strong> chair.urerb@mmsu.edu.ph (Loc. 2104)</p>
                <p><strong>ITC Portal Helpdesk:</strong> itc.helpdesk@mmsu.edu.ph</p>
                <p><strong>Physical Vault &amp; Desk:</strong> Science Complex 2nd Floor, Room 204, Main Campus</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="px-4 py-2 bg-[#14432f] hover:bg-[#0f3323] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
