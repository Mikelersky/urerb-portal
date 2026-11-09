import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { logout } from '../../utils/auth';
import { protocolsApi } from '../../services/api';

export default function Sidebar({ applicationsCount, unreadNotificationsCount = 0 }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [appsCount, setAppsCount] = useState(typeof applicationsCount === 'number' ? applicationsCount : 0);

  useEffect(() => {
    if (typeof applicationsCount === 'number') {
      setAppsCount(applicationsCount);
    }
  }, [applicationsCount]);

  useEffect(() => {
    const fetchCount = () => {
      protocolsApi.list()
        .then((res) => {
          if (res && Array.isArray(res.protocols)) {
            setAppsCount(res.protocols.length);
          }
        })
        .catch(() => {});
    };

    fetchCount();

    const handleSync = () => fetchCount();
    window.addEventListener('urerb_applications_sync', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('urerb_applications_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const isRouteActive = (path) => {
    return location.pathname === path;
  };

  const navLinkClass = (path) => {
    const active = isRouteActive(path);
    if (active) {
      return 'flex items-center justify-between px-3 py-2 rounded-lg bg-[#1e513b] text-white font-medium text-xs sm:text-sm shadow-xs transition-colors';
    }
    return 'flex items-center justify-between px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium text-xs sm:text-sm transition-colors';
  };

  const getIconClass = (path) => {
    return isRouteActive(path) ? 'text-white' : 'text-slate-400 group-hover:text-slate-600';
  };

  const handleSignOut = async () => {
    await logout();
    navigate(ROUTES.AUTH.LOGIN);
  };

  return (
    <aside className="w-64 shrink-0 h-full bg-white border-r border-slate-200 flex flex-col justify-between p-4 overflow-y-auto select-none">
      <div className="space-y-6">
        {/* Navigation Category Title */}
        <div className="pb-1 border-b border-slate-100">
          <div className="px-3 text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">
            ETHICS NAVIGATION
          </div>
          <div className="px-3 text-sm font-bold text-slate-900">
            Researcher Portal
          </div>
        </div>

        {/* Section: Main Workspace */}
        <div className="space-y-1">
          <span className="px-3 text-[11px] font-bold tracking-wider text-slate-400 mb-1.5 block uppercase">
            MAIN WORKSPACE
          </span>
          <nav className="space-y-1">
            <NavLink to={ROUTES.RESEARCHER.DASHBOARD} className={navLinkClass(ROUTES.RESEARCHER.DASHBOARD)}>
              <div className="flex items-center gap-2.5">
                <span className={`material-symbols-outlined text-[19px] ${getIconClass(ROUTES.RESEARCHER.DASHBOARD)}`}>
                  space_dashboard
                </span>
                <span>Dashboard</span>
              </div>
            </NavLink>

            <NavLink to={ROUTES.RESEARCHER.MY_APPLICATIONS} className={navLinkClass(ROUTES.RESEARCHER.MY_APPLICATIONS)}>
              <div className="flex items-center gap-2.5">
                <span className={`material-symbols-outlined text-[19px] ${getIconClass(ROUTES.RESEARCHER.MY_APPLICATIONS)}`}>
                  folder_open
                </span>
                <span>My Applications</span>
              </div>
              {appsCount > 0 && (
                <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${isRouteActive(ROUTES.RESEARCHER.MY_APPLICATIONS) ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {String(appsCount).padStart(2, '0')}
                </span>
              )}
            </NavLink>

            <NavLink to={ROUTES.RESEARCHER.APPLICATION_TRACKING} className={navLinkClass(ROUTES.RESEARCHER.APPLICATION_TRACKING)}>
              <div className="flex items-center gap-2.5">
                <span className={`material-symbols-outlined text-[19px] ${getIconClass(ROUTES.RESEARCHER.APPLICATION_TRACKING)}`}>
                  timeline
                </span>
                <span>Tracking</span>
              </div>
            </NavLink>

            <NavLink to={ROUTES.RESEARCHER.NEW_APPLICATION} className={navLinkClass(ROUTES.RESEARCHER.NEW_APPLICATION)}>
              <div className="flex items-center gap-2.5">
                <span className={`material-symbols-outlined text-[19px] ${getIconClass(ROUTES.RESEARCHER.NEW_APPLICATION)}`}>
                  add
                </span>
                <span>New Application</span>
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
            <NavLink to={ROUTES.RESEARCHER.HELP_CENTER} className={navLinkClass(ROUTES.RESEARCHER.HELP_CENTER)}>
              <div className="flex items-center gap-2.5">
                <span className={`material-symbols-outlined text-[19px] ${getIconClass(ROUTES.RESEARCHER.HELP_CENTER)}`}>
                  help_outline
                </span>
                <span>Help Center</span>
              </div>
            </NavLink>

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

        {/* Bottom Review Protocol Compliance Card */}
        <div className="pt-2">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              REVIEW PROTOCOL
            </span>
            <p className="text-[11px] text-slate-600 leading-snug">
              Ensure all human participant forms adhere to PHREB 2024 standards.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
