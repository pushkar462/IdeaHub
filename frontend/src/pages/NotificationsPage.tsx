import React from 'react';
import { useNotificationStore } from '@/stores/notification.store';
import EmptyState from '@/components/shared/EmptyState';

const iconMap: Record<string, string> = {
  MENTION: '💬',
  ASSIGNMENT: '📌',
  COMMENT_REPLY: '↩️',
  POST_UPDATE: '🔄',
};

const NotificationsPage: React.FC = () => {
  const { list, markRead, markAllRead } = useNotificationStore();

  const unreadCount = list.filter((n) => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-500">You have {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-ghost text-xs">
            Mark all as read ✓
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="All caught up!"
          description="You don't have any notifications right now."
        />
      ) : (
        <div className="space-y-2">
          {list.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex gap-4
                ${n.read
                  ? 'bg-transparent border-transparent opacity-60 hover:bg-surface-hover'
                  : 'bg-white border-brand-200 shadow-sm hover:shadow-md'
                }`}
            >
              <div className="text-xl mt-1">{iconMap[n.type] ?? '🔔'}</div>
              <div className="flex-1">
                <p className={`text-sm ${n.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                  {n.message}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              {!n.read && (
                <div className="w-2 h-2 rounded-full bg-brand-500 mt-2 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
