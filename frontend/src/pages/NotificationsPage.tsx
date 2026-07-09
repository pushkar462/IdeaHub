import React from 'react';
import { AtSign, UserPlus, MessageCircle, RefreshCw, Bell, Check } from 'lucide-react';
import { useNotificationStore } from '@/stores/notification.store';
import EmptyState from '@/components/shared/EmptyState';

// Handbook + redesign: functional icons are Lucide, not emoji.
// One consistent line set, 1.5–2px stroke.
const iconMap: Record<string, { Icon: any; label: string; tone: string }> = {
  MENTION:       { Icon: AtSign,        label: 'Mention',       tone: 'text-brand-primary' },
  ASSIGNMENT:    { Icon: UserPlus,      label: 'Assignment',    tone: 'text-accent-blue'   },
  COMMENT_REPLY: { Icon: MessageCircle, label: 'Comment reply', tone: 'text-accent-green'  },
  POST_UPDATE:   { Icon: RefreshCw,     label: 'Post update',   tone: 'text-accent-orange' },
};

const NotificationsPage: React.FC = () => {
  const { list, markRead, markAllRead } = useNotificationStore();
  const unreadCount = list.filter((n) => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-500">
            {unreadCount === 0 ? 'You’re all caught up.' : `${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-ghost text-xs flex items-center gap-1">
            <Check size={14} /> Mark all as read
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<Bell size={28} strokeWidth={1.5} className="text-brand-primary" />}
          title="Nothing to catch up on"
          description="When someone mentions you, replies to your comment, or updates one of your posts, it lands here."
        />
      ) : (
        <div className="space-y-2">
          {list.map((n) => {
            const meta = iconMap[n.type] ?? { Icon: Bell, label: 'Notification', tone: 'text-brand-primary' };
            const { Icon, label, tone } = meta;
            return (
              <div
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex gap-4 items-start
                  ${n.read
                    ? 'bg-transparent border-transparent opacity-70 hover:bg-surface-hover'
                    : 'bg-white border-brand-primary/20 shadow-sm hover:shadow-md'
                  }`}
              >
                <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-brand-light/60 ${tone}`}>
                  <Icon size={17} strokeWidth={1.75} aria-label={label} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${n.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                    {n.message}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-brand-primary mt-2 flex-shrink-0" aria-label="Unread" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
