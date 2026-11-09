import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SecretariatLayout from '../../layouts/SecretariatLayout';
import { notificationsApi } from '../../services/api';
import { ROUTES } from '../../constants/routes';

export default function SecretariatNotifications() {
  const navigate = useNavigate();
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
      console.error('Failed to load secretariat notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const handleSync = () => fetchNotifications();
    window.addEventListener('urerb_notif_sync', handleSync);
    window.addEventListener('urerb_secretariat_notif_sync', handleSync);
    return () => {
      window.removeEventListener('urerb_notif_sync', handleSync);
      window.removeEventListener('urerb_secretariat_notif_sync', handleSync);
    };
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false, isRead: true })));
      window.dispatchEvent(new Event('urerb_notif_sync'));
      window.dispatchEvent(new Event('urerb_secretariat_notif_sync'));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, unread: false, isRead: true } : n))
      );
      window.dispatchEvent(new Event('urerb_notif_sync'));
      window.dispatchEvent(new Event('urerb_secretariat_notif_sync'));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const filteredNotifications =
    activeTab === 'unread'
      ? notifications.filter((n) => n.unread)
      : notifications;

  return (
    <SecretariatLayout unreadNotificationsCount={unreadCount}>
      <div className="space-y-5">
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
          <span className="text-[#14432f] font-semibold">Notifications</span>
        </nav>

        {/* Header Card */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Secretariat Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#d1fae5] text-[#065f46]">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Track priority intake submissions, deficiency resubmissions, reviewer evaluations, and archive alerts.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="inline-flex items-center p-1 rounded-lg bg-[#f4f6fb] border border-slate-200/80 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-[#14432f] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('unread')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  activeTab === 'unread'
                    ? 'bg-[#14432f] text-white shadow-2xs'
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
              className="h-9 px-3.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            >
              <span className="material-symbols-outlined text-[16px]">
                done_all
              </span>
              <span>Mark all read</span>
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => markAsRead(item.id)}
              className={`bg-white rounded-xl border p-5 shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer ${
                item.unread
                  ? 'border-[#14432f]/30 bg-emerald-50/15'
                  : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${item.iconBg}`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {item.icon}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900">
                      {item.title}
                    </h3>
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[#e8ecfb] text-[#14432f]">
                      {item.protocolId}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {item.category}
                    </span>
                    {item.unread && (
                      <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                    {item.message}
                  </p>
                  <div className="text-[11px] font-mono text-slate-400 pt-0.5">
                    {item.time}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(item.id);
                    navigate(item.actionRoute);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <span>{item.actionLabel}</span>
                  <span className="material-symbols-outlined text-[15px]">
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>
          ))}

          {filteredNotifications.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[20px]">
                  notifications_off
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                No unread notifications
              </h3>
              <p className="text-xs text-slate-500">
                All Secretariat intake and routing alerts have been reviewed.
              </p>
            </div>
          )}
        </div>
      </div>
    </SecretariatLayout>
  );
}

