import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ResearcherLayout from '../../layouts/ResearcherLayout';
import { notificationsApi } from '../../services/api';
import { ROUTES } from '../../constants/routes';

export default function Notifications() {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await notificationsApi.list();
      if (res && res.success && Array.isArray(res.notifications)) {
        setNotifications(res.notifications);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const handleSync = () => fetchNotifications();
    window.addEventListener('urerb_notif_sync', handleSync);
    return () => {
      window.removeEventListener('urerb_notif_sync', handleSync);
    };
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false, isRead: true })));
      window.dispatchEvent(new Event('urerb_notif_sync'));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false, isRead: true } : n)));
      window.dispatchEvent(new Event('urerb_notif_sync'));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const getActionRoute = (notif) => {
    if (notif.protocolId && notif.protocolId.startsWith('URERB')) {
      return `${ROUTES.RESEARCHER.APPLICATION_TRACKING}?id=${notif.protocolId}`;
    }
    return ROUTES.RESEARCHER.HELP_CENTER;
  };

  const filteredNotifications =
    activeTab === 'unread' ? notifications.filter((n) => n.unread) : notifications;

  return (
    <ResearcherLayout unreadNotificationsCount={unreadCount}>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-slate-500 font-medium select-none">
        <Link to={ROUTES.RESEARCHER.DASHBOARD} className="hover:text-slate-800 flex items-center transition-colors">
          <span className="material-symbols-outlined text-[16px] mr-1 text-slate-400">home</span>
          <span>Home</span>
        </Link>
        <span>/</span>
        <span className="text-[#1e513b] font-semibold">Notifications</span>
      </nav>

      {/* Header Notification Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#b8efd1] text-[#002114]">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Stay updated on your research applications and URERB committee reviews.
          </p>
        </div>

        {/* Filter Pills and Mark All As Read */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 border border-slate-200/80 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#1e513b] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                activeTab === 'unread'
                  ? 'bg-[#1e513b] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <button
            type="button"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="h-9 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px] text-[#1e513b]">done_all</span>
            <span>Mark all as read</span>
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex flex-col gap-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
            <span className="material-symbols-outlined text-[36px] text-slate-300 mb-2">notifications_off</span>
            <p className="font-semibold text-slate-700 text-sm">No notifications found</p>
            <p className="mt-1">You are all caught up with your URERB activities.</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            if (notif.type === 'revision') {
              // Revision Required
              return (
                <div
                  key={notif.id}
                  onClick={() => notif.unread && markAsRead(notif.id)}
                  className="bg-[#fff8f8] border border-red-200/80 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-red-50/50"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center shrink-0 mt-0.5 ring-4 ring-red-100/50">
                      <span className="material-symbols-outlined text-[20px]">rate_review</span>
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {notif.unread && (
                          <span className="w-2 h-2 rounded-full bg-[#1e513b] animate-pulse" />
                        )}
                        <span className="font-semibold text-slate-900 text-sm">{notif.title}</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ffdad6] text-[#93000a] border border-red-200">
                          {notif.badge}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 mt-0.5">{notif.message}</p>
                      <p className="text-[12px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        {notif.protocolId && (
                          <>
                            <span className="font-mono font-semibold text-[#1e513b]">
                              {notif.protocolId.startsWith('URERB') ? `Protocol ${notif.protocolId}` : notif.protocolId}
                            </span>
                            <span>·</span>
                          </>
                        )}
                        <span className="text-slate-500">{notif.timestamp}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center sm:self-center self-end shrink-0">
                    <Link
                      to={getActionRoute(notif)}
                      onClick={() => markAsRead(notif.id)}
                      className="h-9 px-4 bg-[#1e513b] hover:bg-[#163f2e] text-white rounded-lg text-xs font-semibold transition-all shadow-xs inline-flex items-center gap-1.5"
                    >
                      <span>{notif.actionLabel || 'View Details'}</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              );
            }

            if (notif.type === 'update' || notif.type === 'clearance') {
              // Application Update
              return (
                <div
                  key={notif.id}
                  onClick={() => notif.unread && markAsRead(notif.id)}
                  className="bg-[#f6f9fc] border border-blue-200/80 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-blue-50/50"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#d5e3fd] text-[#1e513b] flex items-center justify-center shrink-0 mt-0.5 ring-4 ring-blue-100/40">
                      <span className="material-symbols-outlined text-[20px] text-[#1e513b]">fact_check</span>
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {notif.unread && (
                          <span className="w-2 h-2 rounded-full bg-[#1e513b] animate-pulse" />
                        )}
                        <span className="font-semibold text-slate-900 text-sm">{notif.title}</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#b8efd1] text-[#002114]">
                          {notif.badge}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 mt-0.5">{notif.message}</p>
                      <p className="text-[12px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        {notif.protocolId && (
                          <>
                            <span className="font-mono font-semibold text-[#1e513b]">
                              {notif.protocolId.startsWith('URERB') ? `Protocol ${notif.protocolId}` : notif.protocolId}
                            </span>
                            <span>·</span>
                          </>
                        )}
                        <span className="text-slate-500">{notif.timestamp}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center sm:self-center self-end shrink-0">
                    <Link
                      to={getActionRoute(notif)}
                      onClick={() => markAsRead(notif.id)}
                      className="h-9 px-4 border border-slate-300 hover:bg-white text-slate-800 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <span>{notif.actionLabel || 'View Details'}</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              );
            }

            // Other notifications (Application Submitted, Secretariat Notice)
            return (
              <div
                key={notif.id}
                onClick={() => notif.unread && markAsRead(notif.id)}
                className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-slate-50"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5 ring-4 ring-slate-100">
                    <span className="material-symbols-outlined text-[20px]">{notif.icon || 'notifications'}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {notif.unread && (
                        <span className="w-2 h-2 rounded-full bg-[#1e513b] animate-pulse" />
                      )}
                      <span className="font-semibold text-slate-900 text-sm">{notif.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                        {notif.badge}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 mt-0.5">{notif.message}</p>
                    <p className="text-[12px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      {notif.protocolId && (
                        <>
                          <span className="font-mono font-semibold text-slate-600">
                            {notif.protocolId.startsWith('URERB') ? `Protocol ${notif.protocolId}` : notif.protocolId}
                          </span>
                          <span>·</span>
                        </>
                      )}
                      <span className="text-slate-500">{notif.timestamp}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center sm:self-center self-end shrink-0">
                  <Link
                    to={getActionRoute(notif)}
                    onClick={() => markAsRead(notif.id)}
                    className="h-9 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <span>{notif.actionLabel || 'View Details'}</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </ResearcherLayout>
  );
}
