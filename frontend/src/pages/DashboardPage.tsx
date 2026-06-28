import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { usePostStore } from '@/stores/post.store';
import { useNotificationStore } from '@/stores/notification.store';
import PostCard from '@/components/posts/PostCard';
import Loader from '@/components/shared/Loader';
import EmptyState from '@/components/shared/EmptyState';

const StatCard: React.FC<{ icon: string; label: string; value: number; color: string }> = ({
  icon, label, value, color,
}) => (
  <div className="card p-5 flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
);

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { feed, loading, fetchFeed, reactToPost, stats, fetchStats } = usePostStore();
  const { list: notifications, unreadCount } = useNotificationStore();

  useEffect(() => {
    fetchFeed();
    fetchStats();
  }, [fetchFeed, fetchStats]);

  const recent = feed.slice(0, 5);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Welcome */}
      <div className="card p-8 bg-brand-primary text-white border-0 shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-sm text-brand-light mb-1 font-medium tracking-wide">Welcome back,</p>
          <h2 className="text-3xl font-bold mb-1">{user?.name ?? 'Team member'} 👋</h2>
          <p className="text-sm text-brand-light font-medium">{user?.role?.replace('_', '/')} · {user?.email}</p>
        </div>
        {/* Decorative circle */}
        <div className="absolute -right-10 -top-20 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon="📊" label="Total Active Posts" value={stats.totalActive}    color="bg-blue-50" />
        <StatCard icon="📌" label="Assigned to Me"     value={stats.myActiveTasks}  color="bg-purple-50" />
        <StatCard icon="👀" label="Needs Review"       value={stats.needReview}     color="bg-yellow-50" />
        <StatCard icon="✅" label="My Completed"       value={stats.completed}      color="bg-green-50" />
      </div>

      {/* Notifications banner */}
      {unreadCount > 0 && (
        <Link
          to="/notifications"
          className="card p-4 flex items-center gap-3 bg-brand-light/50 border-brand-primary/20
                     hover:bg-brand-light transition-colors"
        >
          <span className="text-2xl">🔔</span>
          <div>
            <p className="text-sm font-semibold text-brand-primary">
              You have {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-brand-primary/80 font-medium">Click to view them →</p>
          </div>
        </Link>
      )}

      {/* Recent posts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Recent Discussions</h3>
          <Link to="/feed" className="text-sm font-medium text-brand-primary hover:underline">View all →</Link>
        </div>

        {loading ? (
          <Loader />
        ) : recent.length === 0 ? (
          <EmptyState
            icon="📭"
            title="No posts yet"
            description="Be the first to start a discussion!"
          />
        ) : (
          <div className="space-y-3">
            {recent.map((post) => (
              <PostCard key={post.id} post={post} onReact={(id, emoji) => reactToPost(id, emoji)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
