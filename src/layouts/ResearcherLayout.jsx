import React from 'react';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import Footer from '../components/layout/Footer';
import { UNREAD_NOTIFS_STORAGE_KEY } from '../data/demoData';

export default function ResearcherLayout({ children, applicationsCount = 0, unreadNotificationsCount }) {
  const [unreadCount, setUnreadCount] = React.useState(() => {
    if (typeof unreadNotificationsCount === 'number') return unreadNotificationsCount;
    const saved = localStorage.getItem(UNREAD_NOTIFS_STORAGE_KEY);
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  React.useEffect(() => {
    if (typeof unreadNotificationsCount === 'number') {
      setUnreadCount(unreadNotificationsCount);
      localStorage.setItem(UNREAD_NOTIFS_STORAGE_KEY, unreadNotificationsCount.toString());
    }
  }, [unreadNotificationsCount]);

  React.useEffect(() => {
    const handleUpdate = () => {
      const saved = localStorage.getItem(UNREAD_NOTIFS_STORAGE_KEY);
      if (saved !== null) {
        setUnreadCount(parseInt(saved, 10));
      }
    };
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('urerb_notif_sync', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('urerb_notif_sync', handleUpdate);
    };
  }, []);

  return (
    <div className="h-screen w-full flex flex-col bg-[#faf8ff] text-slate-800 font-sans antialiased overflow-hidden selection:bg-[#1e513b]/10 selection:text-[#1e513b]">
      {/* Top Header - Fixed/Pinned at 64px height */}
      <Header
        roleName="Researcher"
        unreadNotificationsCount={unreadCount}
      />

      {/* Middle Work Area: Sidebar + Scrollable Content */}
      <div className="flex-1 min-h-0 flex overflow-hidden w-full">
        {/* Left Sidebar Navigation */}
        <Sidebar
          applicationsCount={applicationsCount}
          unreadNotificationsCount={unreadCount}
        />

        {/* Right Main Content Canvas - Scrolls cleanly without footer overlap */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto overflow-x-hidden p-6 md:p-8 pb-12 bg-[#faf8ff]">
          <div className="max-w-7xl w-full mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Institutional Fixed Footer */}
      <Footer />
    </div>
  );
}
