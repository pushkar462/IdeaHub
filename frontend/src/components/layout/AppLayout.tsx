import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';

const AppLayout: React.FC = () => {
  const { fetchMe } = useAuthStore();
  const { fetch: fetchNotifications } = useNotificationStore();

  useEffect(() => {
    fetchMe();
    fetchNotifications();
    // Poll notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchMe, fetchNotifications]);

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
