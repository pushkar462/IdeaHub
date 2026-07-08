import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '@/api/axios';
import { useAuthStore } from '@/stores/auth.store';
import { User, Post } from '@/types';
import Avatar from '@/components/shared/Avatar';
import Loader from '@/components/shared/Loader';
import PostCard from '@/components/posts/PostCard';
import { usePostStore } from '@/stores/post.store';

const ProfilePage: React.FC = () => {
  const { id } = useParams();
  const { user: currentUser, fetchMe } = useAuthStore();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', avatarUrl: '' });
  const [saving, setSaving] = useState(false);
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  interface ContribPost {
    id: number;
    postNumber?: string;
    title: string;
    type: string;
    section: string;
    status: string;
    resolution?: string | null;
    updatedAt: string;
  }
  interface Contributions {
    raised: ContribPost[];
    resolved: ContribPost[];
    answered: ContribPost[];
    counts: { raised: number; resolved: number; answered: number };
  }
  const [contributions, setContributions] = useState<Contributions | null>(null);
  const [contribLoading, setContribLoading] = useState(false);
  const [since, setSince] = useState<'all' | '30d' | '7d'>('all');
  const [activeTab, setActiveTab] = useState<'posts' | 'contributions'>('posts');

  const isOwnProfile = !id || Number(id) === currentUser?.id;
  const canViewContributions =
    isOwnProfile || currentUser?.role === 'ADMIN' || currentUser?.role === 'FOUNDER';

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        let userToSet = null;
        if (isOwnProfile) {
          userToSet = currentUser;
          setForm({
            name: currentUser?.name || '',
            bio: currentUser?.bio || '',
            avatarUrl: currentUser?.avatarUrl || '',
          });
        } else {
          const { data } = await api.get(`/users/${id}`);
          userToSet = data;
        }
        setProfileUser(userToSet);
        
        if (userToSet) {
          setPostsLoading(true);
          try {
            let posts: any[] = [];
            try {
              // 1st try: dedicated endpoint (works once Render deploys)
              const res = await api.get(`/users/${userToSet.id}/posts`);
              posts = Array.isArray(res.data) ? res.data : [];
            } catch {
              try {
                // 2nd try: feed with authorId param (works once Render deploys the schema update)
                const res = await api.get(`/posts`, { params: { authorId: userToSet.id } });
                posts = Array.isArray(res.data) ? res.data : [];
              } catch {
                // 3rd fallback: fetch feed and filter client-side (works on any version of backend)
                const res = await api.get(`/posts`, { params: { limit: 50 } });
                const all = Array.isArray(res.data) ? res.data : [];
                posts = all.filter((p: any) => p.author?.id === userToSet.id);
              }
            }
            setPosts(posts);
          } catch (err) {
            console.error('Failed to fetch user posts', err);
          } finally {
            setPostsLoading(false);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id, currentUser, isOwnProfile]);

  useEffect(() => {
    if (!profileUser || !canViewContributions) {
      setContributions(null);
      return;
    }
    const params: Record<string, string> = {};
    if (since === '30d') params.since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    if (since === '7d')  params.since = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000).toISOString();
    setContribLoading(true);
    api
      .get(`/users/${profileUser.id}/contributions`, { params })
      .then((res) => {
        // Backend wraps in { data: ... }; api layer may or may not unwrap
        const payload = res.data?.data ?? res.data;
        setContributions(payload);
      })
      .catch(() => setContributions(null))
      .finally(() => setContribLoading(false));
  }, [profileUser, canViewContributions, since]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnProfile) return;

    setSaving(true);
    try {
      await api.patch('/auth/me', form);
      await fetchMe();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;
  if (!profileUser) return <div className="text-center text-gray-500 py-10">User not found</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="card overflow-hidden">
        {/* Cover */}
        <div className="h-32 bg-gradient-to-r from-brand-400 to-indigo-500"></div>

        <div className="px-6 pb-6 relative">
          {/* Avatar */}
          <div className="-mt-12 mb-4 flex justify-between items-end">
            <div className="rounded-full p-1 bg-white inline-block">
              <Avatar user={profileUser} size="lg" className="w-24 h-24 text-3xl" />
            </div>
            {isOwnProfile && !editing && (
              <button onClick={() => setEditing(true)} className="btn-ghost text-sm">
                Edit Profile
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-4 animate-in">
              <div>
                <label className="label">Name</label>
                <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Bio</label>
                <textarea className="input resize-none min-h-[80px]" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
              </div>
              <div>
                <label className="label">Avatar URL (Optional)</label>
                <input className="input" type="url" value={form.avatarUrl} onChange={e => setForm({ ...form, avatarUrl: e.target.value })} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setEditing(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </form>
          ) : (
            <div className="animate-in">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{profileUser.name}</h1>
              <p className="text-sm font-medium text-brand-600 mb-4">{profileUser.role?.replace('_', '/')}</p>

              <div className="text-gray-600 text-sm whitespace-pre-wrap mb-6">
                {profileUser.bio || <span className="italic text-gray-400">No bio provided</span>}
              </div>

              <div className="flex items-center gap-6 pt-4 border-t border-surface-border text-sm">
                <div className="flex flex-col">
                  <span className="font-bold text-gray-900 text-lg">{profileUser._count?.posts ?? 0}</span>
                  <span className="text-gray-500">Posts</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-gray-900 text-lg">{profileUser._count?.comments ?? 0}</span>
                  <span className="text-gray-500">Comments</span>
                </div>
                <div className="ml-auto text-gray-400 text-xs text-right">
                  Joined<br />
                  {new Date(profileUser.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {!editing && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-surface-border">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('posts')}
                className={`text-sm font-semibold px-4 py-2 border-b-2 -mb-px transition-colors ${
                  activeTab === 'posts'
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Recent posts
              </button>
              {canViewContributions && (
                <button
                  onClick={() => setActiveTab('contributions')}
                  className={`text-sm font-semibold px-4 py-2 border-b-2 -mb-px transition-colors ${
                    activeTab === 'contributions'
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Contributions
                </button>
              )}
            </div>
            {activeTab === 'contributions' && canViewContributions && (
              <div className="flex bg-gray-100 p-1 rounded-lg text-[11px] font-semibold">
                {(['all', '30d', '7d'] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => setSince(w)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      since === w ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {w === 'all' ? 'All time' : `Last ${w}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {activeTab === 'posts' && (
            postsLoading ? (
              <Loader />
            ) : posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map((post) => <PostCard key={post.id} post={post as any} />)}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-6 bg-white rounded-lg border border-surface-border">
                {isOwnProfile ? "You haven't posted anything yet." : "This user hasn't posted anything yet."}
              </div>
            )
          )}

          {activeTab === 'contributions' && canViewContributions && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                Handbook Section 10 · factual record, no scores, no ranking. Visible to{' '}
                {isOwnProfile ? 'you' : 'admins and the founder'}.
              </p>
              {contribLoading || !contributions ? (
                <Loader />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ContribPanel label="Posts raised"          items={contributions.raised}   count={contributions.counts.raised}   emptyLabel="No posts raised in this window." />
                  <ContribPanel label="Posts helped resolve"  items={contributions.resolved} count={contributions.counts.resolved} emptyLabel="No resolutions credited in this window." />
                  <ContribPanel label="Questions answered"    items={contributions.answered} count={contributions.counts.answered} emptyLabel="No answers credited in this window." />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface ContribPost {
  id: number;
  postNumber?: string;
  title: string;
  type: string;
  section: string;
  status: string;
  resolution?: string | null;
  updatedAt: string;
}

const ContribPanel: React.FC<{
  label: string;
  items: ContribPost[];
  count: number;
  emptyLabel: string;
}> = ({ label, items, count, emptyLabel }) => (
  <div className="card p-4 flex flex-col min-h-[180px]">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-bold text-gray-700">{label}</h3>
      <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{count}</span>
    </div>
    {items.length === 0 ? (
      <div className="text-xs text-gray-400 italic flex-1 flex items-center justify-center">{emptyLabel}</div>
    ) : (
      <ul className="space-y-2 text-sm">
        {items.slice(0, 10).map((p) => (
          <li key={p.id} className="border-b border-surface-border pb-2 last:border-b-0">
            <a href={`/post/${p.id}`} className="text-gray-800 hover:text-brand-primary transition-colors line-clamp-1 font-medium">
              {p.title}
            </a>
            <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
              {p.postNumber && <span className="font-mono">{p.postNumber}</span>}
              <span>&middot;</span>
              <span>{p.type}</span>
              <span>&middot;</span>
              <span>{p.section}</span>
              {p.resolution && (
                <>
                  <span>&middot;</span>
                  <span className="text-green-600 font-semibold">{p.resolution}</span>
                </>
              )}
            </div>
          </li>
        ))}
        {items.length > 10 && (
          <li className="text-[11px] text-gray-400 italic pt-1">+ {items.length - 10} more</li>
        )}
      </ul>
    )}
  </div>
);

export default ProfilePage;
