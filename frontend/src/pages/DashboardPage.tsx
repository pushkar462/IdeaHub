import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, User, Eye, CheckCircle2, Bell } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { usePostStore } from '@/stores/post.store';
import { useNotificationStore } from '@/stores/notification.store';
import PostCard from '@/components/posts/PostCard';
import Loader from '@/components/shared/Loader';
import EmptyState from '@/components/shared/EmptyState';

const StatCard: React.FC<{
  Icon: any;
  label: string;
  value: number;
}> = ({ Icon, label, value }) => (
  <Link
    to="/feed"
    className="card p-5 flex items-center gap-4 hover:border-brand-primary/40 transition-colors"
  >
    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-brand-light text-brand-primary">
      <Icon size={18} strokeWidth={1.75} />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900 font-heading leading-none">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  </Link>
);

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { feed, loading, fetchFeed, reactToPost, stats, fetchStats } = usePostStore();
  const { unreadCount } = useNotificationStore();

  useEffect(() => {
    fetchFeed();
    fetchStats();
  }, [fetchFeed, fetchStats]);

  const recent = feed.slice(0, 5);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Welcome */}
      <div className="card p-8 bg-brand-primary text-white border-0 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.14em] text-brand-light mb-2 font-semibold">Welcome back</p>
          <h2 className="text-3xl font-bold mb-1 font-heading">{user?.name ?? 'Team member'}</h2>
          <p className="text-sm text-brand-light font-medium">{user?.role?.replace('_', '/')} · {user?.email}</p>
        </div>
        <div className="absolute -right-10 -top-20 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard Icon={Inbox}         label="Open posts"          value={stats.totalActive} />
        <StatCard Icon={User}          label="Need my answer"      value={stats.myActiveTasks} />
        <StatCard Icon={Eye}           label="Need a first response" value={stats.needReview} />
        <StatCard Icon={CheckCircle2}  label="I resolved"          value={stats.completed} />
      </div>

      {/* Notifications banner */}
      {unreadCount > 0 && (
        <Link
          to="/notifications"
          className="card p-4 flex items-center gap-3 bg-brand-light/50 border-brand-primary/20 hover:bg-brand-light transition-colors"
        >
          <Bell size={20} className="text-brand-primary" />
          <div>
            <p className="text-sm font-semibold text-brand-primary">
              {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-brand-primary/80 font-medium">Click to review them &rarr;</p>
          </div>
        </Link>
      )}

      {/* Recent posts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 font-heading text-lg">Recent activity</h3>
          <Link to="/feed" className="text-sm font-medium text-brand-primary hover:underline">Open board &rarr;</Link>
        </div>

        {loading ? (
          <Loader />
        ) : recent.length === 0 ? (
          <EmptyState
            icon={<Inbox size={26} strokeWidth={1.5} className="text-brand-primary" />}
            title="The board is quiet"
            description="Post the first Question, Problem, or Idea to kick things off."
            action={<Link to="/feed" className="btn-primary text-sm px-5">Open board</Link>}
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
