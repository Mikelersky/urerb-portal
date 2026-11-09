import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import Footer from '../components/layout/Footer';
import { getCurrentUser, logout } from '../utils/auth';
import { reviewsApi, notificationsApi } from '../services/api';

const DEFAULT_REV_PROFILE = {
  name: 'Dr. Alicia G. Barba, Ph.D.',
  title: 'Scientific Reviewer — Panel A',
  email: 'reviewer@mmsu.edu.ph',
};

export default function ReviewerLayout({ children, assignedCount, unreadNotificationsCount }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(getCurrentUser);
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [activeCount, setActiveCount] = useState(typeof assignedCount === 'number' ? assignedCount : 0);
  const [unreadNotifs, setUnreadNotifs] = useState(typeof unreadNotificationsCount === 'number' ? unreadNotificationsCount : 0);

  useEffect(() => {
    if (typeof assignedCount === 'number') {
      setActiveCount(assignedCount);
    }
  }, [assignedCount]);

  useEffect(() => {
    if (typeof unreadNotificationsCount === 'number') {
      setUnreadNotifs(unreadNotificationsCount);
    }
  }, [unreadNotificationsCount]);

  useEffect(() => {
    const fetchAssignedAndNotifs = () => {
      reviewsApi.getAssigned()
        .then((res) => {
          const list = res?.assigned || res?.protocols || [];
          if (Array.isArray(list)) {
            setActiveCount(list.filter((p) => p.status !== 'Recused' && p.assignmentStatus !== 'Submitted').length);
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

    fetchAssignedAndNotifs();

    const handleAuthSync = () => {
      setCurrentUser(getCurrentUser());
      fetchAssignedAndNotifs();
    };

    window.addEventListener('urerb_auth_sync', handleAuthSync);
    window.addEventListener('urerb_reviewer_sync', fetchAssignedAndNotifs);
    window.addEventListener('urerb_reviewer_notif_sync', fetchAssignedAndNotifs);
    window.addEventListener('storage', handleAuthSync);
    return () => {
      window.removeEventListener('urerb_auth_sync', handleAuthSync);
      window.removeEventListener('urerb_reviewer_sync', fetchAssignedAndNotifs);
      window.removeEventListener('urerb_reviewer_notif_sync', fetchAssignedAndNotifs);
      window.removeEventListener('storage', handleAuthSync);
    };
  }, []);

  const displayName = currentUser?.name || currentUser?.fullName || DEFAULT_REV_PROFILE.name;
  const displayTitle = currentUser?.title || DEFAULT_REV_PROFILE.title;
  const displayEmail = currentUser?.email || DEFAULT_REV_PROFILE.email;
  const computedInitials = displayName
    ? displayName
        .replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+/i, '')
        .split(/\s+/)
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'RV';
  const displayInitials = currentUser?.initials || computedInitials || 'RV';

  const isRouteActive = (path) => {
    return location.pathname === path;
  };

  const navLinkClass = (path) => {
    const active = isRouteActive(path);
    if (active) {
      return 'flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#1e513b] text-white font-medium text-xs sm:text-sm shadow-xs transition-colors';
    }
    return 'flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium text-xs sm:text-sm transition-colors';
  };

  const getIconClass = (path) => {
    return isRouteActive(path) ? 'text-white' : 'text-slate-400 group-hover:text-slate-600';
  };

  const handleSignOut = async () => {
    await logout();
    setShowProfileMenu(false);
    navigate(ROUTES.AUTH.LOGIN);
  };

  return (
    <div className="h-screen w-full flex flex-col bg-[#faf8ff] text-slate-800 font-sans antialiased overflow-hidden selection:bg-[#1e513b]/10 selection:text-[#1e513b]">
      {/* Top Pinned Header */}
      <header className="h-16 shrink-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shadow-xs select-none relative">
        {/* Left: Mobile hamburger + MMSU Seal & Portal Identification */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="md:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <span className="material-symbols-outlined text-[22px]">
              {isMobileSidebarOpen ? 'close' : 'menu'}
            </span>
          </button>

          <Link to={ROUTES.REVIEWER.DASHBOARD} className="flex items-center gap-3 group">
            <img
              src="/logos/mmsu-seal.png"
              alt="Mariano Marcos State University Seal"
              className="h-10 w-auto object-contain shrink-0"
            />
            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-base">
                  URERB Portal
                </span>
                <span className="text-[10px] font-mono bg-[#ece6f0] text-slate-700 px-1.5 py-0.5 rounded border border-slate-300/60 font-semibold">
                  v2.5
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium uppercase tracking-tight leading-tight hidden sm:block">
                MARIANO MARCOS STATE UNIVERSITY · UNIVERSITY RESEARCH ETHICS REVIEW BOARD
              </p>
            </div>
          </Link>
        </div>

        {/* Right: Notifications & Reviewer Profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Notifications Bell Link */}
          <Link
            to={ROUTES.REVIEWER.NOTIFICATIONS}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors relative cursor-pointer ${
              isRouteActive(ROUTES.REVIEWER.NOTIFICATIONS)
                ? 'bg-[#1e513b] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Reviewer notifications"
          >
            <span className="material-symbols-outlined text-[20px]">
              notifications
            </span>
            {unreadNotifs > 0 && (
              <span
                className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full ring-2 ${
                  isRouteActive(ROUTES.REVIEWER.NOTIFICATIONS)
                    ? 'bg-amber-400 ring-[#1e513b]'
                    : 'bg-rose-600 ring-white animate-pulse'
                }`}
              ></span>
            )}
          </Link>

          {/* Reviewer Profile Avatar & Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-slate-900 leading-tight group-hover:text-[#1e513b] transition-colors">
                  {displayName}
                </div>
                <div className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                  {displayTitle}
                </div>
              </div>
              <div
                className="w-9 h-9 rounded-full bg-[#1e513b] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 select-none ring-2 ring-emerald-700/20 group-hover:ring-[#1e513b]/40 transition-all"
              >
                <span>{displayInitials}</span>
              </div>
            </button>

            {/* Profile Menu Popover */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 text-xs animate-in fade-in duration-150 space-y-3">
                <div className="pb-2 border-b border-slate-100">
                  <div className="font-bold text-slate-900">
                    {displayName}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {displayTitle}
                  </div>
                  {displayEmail && (
                    <div className="text-[10px] font-mono text-slate-400 mt-1">
                      {displayEmail}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Link
                    to={ROUTES.REVIEWER.PROFILE}
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
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
                      setShowGuidelinesModal(true);
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors text-left cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-slate-400">
                      menu_book
                    </span>
                    <span>Reviewer Guidelines</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowHelpModal(true);
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors text-left cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-slate-400">
                      help
                    </span>
                    <span>Reviewer Support &amp; Help</span>
                  </button>
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
        </div>
      </header>

      {/* Middle Layout: Sidebar + Main Content */}
      <div className="flex-1 min-h-0 flex overflow-hidden w-full relative">
        {/* Left Sidebar Navigation */}
        <aside
          className={`w-64 shrink-0 h-full bg-white border-r border-slate-200 flex flex-col justify-between p-4 overflow-y-auto select-none z-40 transition-transform duration-200 md:translate-x-0 ${
            isMobileSidebarOpen
              ? 'absolute inset-y-0 left-0 shadow-2xl translate-x-0'
              : 'hidden md:flex'
          }`}
        >
          <div className="space-y-6">
            {/* Header / Category Title */}
            <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="px-3 text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">
                  ETHICS NAVIGATION
                </div>
                <div className="px-3 text-sm font-bold text-slate-900">
                  Reviewer Workspace
                </div>
              </div>
              {isMobileSidebarOpen && (
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="md:hidden text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>

            {/* Section: Main Workspace */}
            <div className="space-y-1">
              <span className="px-3 text-[11px] font-bold tracking-wider text-slate-400 mb-1.5 block uppercase">
                MAIN WORKSPACE
              </span>
              <nav className="space-y-1">
                <NavLink
                  to={ROUTES.REVIEWER.DASHBOARD}
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={navLinkClass(ROUTES.REVIEWER.DASHBOARD)}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`material-symbols-outlined text-[19px] ${getIconClass(ROUTES.REVIEWER.DASHBOARD)}`}>
                      space_dashboard
                    </span>
                    <span>Reviewer Dashboard</span>
                  </div>
                </NavLink>

                <NavLink
                  to={ROUTES.REVIEWER.ASSIGNED_APPLICATIONS}
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={navLinkClass(ROUTES.REVIEWER.ASSIGNED_APPLICATIONS)}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`material-symbols-outlined text-[19px] ${getIconClass(ROUTES.REVIEWER.ASSIGNED_APPLICATIONS)}`}>
                      assignment
                    </span>
                    <span>Assigned Applications</span>
                  </div>
                  {activeCount > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                        isRouteActive(ROUTES.REVIEWER.ASSIGNED_APPLICATIONS)
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {String(activeCount).padStart(2, '0')}
                    </span>
                  )}
                </NavLink>

                <NavLink
                  to={ROUTES.REVIEWER.REVIEW_WORKSPACE}
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={navLinkClass(ROUTES.REVIEWER.REVIEW_WORKSPACE)}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`material-symbols-outlined text-[19px] ${getIconClass(ROUTES.REVIEWER.REVIEW_WORKSPACE)}`}>
                      rate_review
                    </span>
                    <span>Review Workspace</span>
                  </div>
                </NavLink>

                <NavLink
                  to={ROUTES.REVIEWER.REVIEW_HISTORY}
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={navLinkClass(ROUTES.REVIEWER.REVIEW_HISTORY)}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`material-symbols-outlined text-[19px] ${getIconClass(ROUTES.REVIEWER.REVIEW_HISTORY)}`}>
                      history
                    </span>
                    <span>Review History</span>
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
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    setShowGuidelinesModal(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium text-xs sm:text-sm transition-colors cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[19px] text-slate-400 group-hover:text-slate-600">
                      menu_book
                    </span>
                    <span>Reviewer Guidelines</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    setShowHelpModal(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium text-xs sm:text-sm transition-colors cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[19px] text-slate-400 group-hover:text-slate-600">
                      help_outline
                    </span>
                    <span>Reviewer Support</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 font-medium text-xs sm:text-sm transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[19px] text-rose-500">
                      logout
                    </span>
                    <span>Sign Out</span>
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Bottom Card: Reviewer Protocol */}
          <div className="pt-4 border-t border-slate-100">
            <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-lg flex flex-col gap-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 text-slate-700">
                <span className="material-symbols-outlined text-[16px] text-slate-500">
                  verified_user
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  REVIEWER PROTOCOL
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                PHREB Level 2 Standards · Adhere to 14-day review turnaround.
              </p>
            </div>
          </div>
        </aside>

        {/* Mobile backdrop overlay */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 z-30 md:hidden backdrop-blur-2xs"
          ></div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto overflow-x-hidden p-6 md:p-8 pb-12 bg-[#faf8ff]">
          <div className="max-w-7xl w-full mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Institutional Fixed Footer */}
      <Footer />

      {/* Guidelines Modal */}
      {showGuidelinesModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1e513b]">menu_book</span>
                <h3 className="font-bold text-slate-900 text-base">URERB Reviewer Guidelines</h3>
              </div>
              <button
                onClick={() => setShowGuidelinesModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                <strong>PHREB Standard:</strong> Initial scientific and ethical evaluation of expedited protocols must be accomplished within 14 calendar days from receipt of the assignment.
              </p>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-semibold text-slate-800 mb-1">Standard Checklist Items:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Form 15: Evaluation of scientific merit and research methodology.</li>
                  <li>Form 16: Assessment of informed consent clarity and dialect translations.</li>
                  <li>Form 17: Departmental endorsement and risk minimization plan.</li>
                </ul>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowGuidelinesModal(false)}
                className="px-4 py-2 bg-[#1e513b] text-white text-xs font-semibold rounded-lg hover:bg-[#163f2e]"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1e513b]">help</span>
                <h3 className="font-bold text-slate-900 text-base">Reviewer Support</h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                Need assistance with assigned protocol deliberation or evaluation submissions?
              </p>
              <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100 space-y-1 text-emerald-900">
                <p><strong>URERB Secretariat:</strong> urerb@mmsu.edu.ph</p>
                <p><strong>ITC Support:</strong> itc.helpdesk@mmsu.edu.ph</p>
                <p><strong>Office:</strong> Science Complex 2nd Floor, Main Campus</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-[#1e513b] text-white text-xs font-semibold rounded-lg hover:bg-[#163f2e]"
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
