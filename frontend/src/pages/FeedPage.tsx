import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';
import { Search, Filter, FileText, Plus, Inbox } from 'lucide-react';
import api from '@/api/axios';
import { usePostStore } from '@/stores/post.store';
import { useAuthStore } from '@/stores/auth.store';
import PostCard from '@/components/posts/PostCard';
import CreatePostModal from '@/components/posts/CreatePostModal';
import Loader from '@/components/shared/Loader';
import EmptyState from '@/components/shared/EmptyState';
import { Post, User } from '@/types';

const TYPES = ['QUESTION', 'PROBLEM', 'IDEA'];
const SECTIONS = ['BILLS', 'INVOICING', 'PATIENTS', 'CASES', 'PARTNERS', 'HOSPITALS', 'DOCTORS', 'WHATSAPP', 'PLATFORM', 'GENERAL'];

// Handbook D1: default filter = "Open / needs response" — OPEN + un-acknowledged.
// The other options are plain status filters; ALL toggles off the filter entirely.
const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'NEEDS_RESPONSE', label: 'Open / needs response' },
  { value: 'OPEN',           label: 'Open'                  },
  { value: 'DISCUSSING',     label: 'Discussing'            },
  { value: 'RESOLVED',       label: 'Resolved'              },
  { value: 'ALL',            label: 'All statuses'          },
];

const FeedPage: React.FC = () => {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const { feed, loading, hasMore, loadingMore, fetchFeed, fetchMoreFeed, reactToPost, deletePost, totalPosts, stats } = usePostStore();

  // Read initial state from URL so sidebar links (?section=BILLS, ?mine=1)
  // and legacy /archive redirects (?status=RESOLVED) hydrate correctly.
  const [search, setSearch]     = useState(searchParams.get('q') ?? '');
  const [type, setType]         = useState(searchParams.get('type') ?? '');
  const [section, setSection]   = useState(searchParams.get('section') ?? '');
  const [status, setStatus]     = useState(searchParams.get('status') ?? 'NEEDS_RESPONSE');
  const [ownerId, setOwnerId]   = useState(searchParams.get('ownerId') ?? '');
  const [authorId, setAuthorId] = useState(
    searchParams.get('mine') === '1' && user?.id ? String(user.id) : (searchParams.get('authorId') ?? '')
  );

  // React when the sidebar changes the URL while we're already on /feed.
  useEffect(() => {
    const urlSection = searchParams.get('section') ?? '';
    const urlStatus  = searchParams.get('status')  ?? 'NEEDS_RESPONSE';
    const urlMine    = searchParams.get('mine') === '1';
    if (urlSection !== section) setSection(urlSection);
    if (urlStatus  !== status)  setStatus(urlStatus);
    if (urlMine && user?.id && authorId !== String(user.id)) setAuthorId(String(user.id));
    if (!urlMine && searchParams.get('authorId') === null && authorId && user?.id === Number(authorId)) {
      setAuthorId('');
    }

  }, [searchParams]);
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  const [viewMode, setViewMode] = useState<'LIST' | 'KANBAN'>(() => {
    return (localStorage.getItem('feed_view_mode') as 'LIST' | 'KANBAN') || 'LIST';
  });

  useEffect(() => {
    localStorage.setItem('feed_view_mode', viewMode);
  }, [viewMode]);
  
  const [owners, setOwners] = useState<Pick<User, 'id' | 'name'>[]>([]);
  const [ownersLoading, setOwnersLoading] = useState(true);

  // Fetch potential owners/users for filtering
  useEffect(() => {
    api.get('/auth/users', { params: { limit: 100 } })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setOwners(list.map((u: User) => ({ id: u.id, name: u.name })));
      })
      .catch(() => {})
      .finally(() => setOwnersLoading(false));
  }, []);

  // Fetch feed on filter changes
  useEffect(() => {
    // Handbook D1: "Open / needs response" → status=OPEN + needResponse
    const isNeedsResponse = status === 'NEEDS_RESPONSE';
    const effectiveStatus =
      viewMode === 'KANBAN' ? '' :
      status === 'ALL' ? 'ALL' :
      isNeedsResponse ? 'OPEN' : status;

    fetchFeed({
      search,
      type,
      section,
      status: effectiveStatus,
      needResponse: viewMode === 'KANBAN' ? undefined : (isNeedsResponse || undefined),
      ownerId: ownerId ? Number(ownerId) : undefined,
      authorId: authorId ? Number(authorId) : undefined,
    });
  }, [search, type, section, status, ownerId, authorId, viewMode]);

  const hasActiveFilters = type || section || (status && status !== 'NEEDS_RESPONSE') || search || ownerId || authorId;
  const selectedOwner = owners.find((c) => String(c.id) === ownerId);
  const currentStatusLabel = STATUS_FILTERS.find((s) => s.value === status)?.label ?? status;

  const clearAllFilters = () => {
    setSearch('');
    setType('');
    setSection('');
    setStatus('NEEDS_RESPONSE');
    setOwnerId('');
    setAuthorId('');
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Header & Filter Controls */}
      <div className="card p-5 space-y-4">
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            className="input pl-11 bg-gray-50 focus:bg-white"
            placeholder="Search first — title, body, or a bill / case ref"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            className="input flex-1 min-w-[130px] bg-gray-50"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">All Types</option>
            {TYPES.map((c) => (
              <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase().replace('_', ' ')}</option>
            ))}
          </select>

          <select
            className="input flex-1 min-w-[130px] bg-gray-50"
            value={section}
            onChange={(e) => setSection(e.target.value)}
          >
            <option value="">All Sections</option>
            {SECTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            className="input flex-1 min-w-[180px] bg-gray-50"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            className="input flex-1 min-w-[130px] bg-gray-50"
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            disabled={ownersLoading}
          >
            <option value="">All Owners</option>
            {owners.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex flex-wrap items-center gap-2 pt-2 border-t border-surface-border">
            <Filter size={14} className="text-gray-400 mr-1" />
            {authorId && (
              <span className="badge bg-brand-light text-brand-primary">
                My Posts
                <button onClick={() => setAuthorId('')} className="ml-1.5 text-brand-primary hover:text-gray-900">✕</button>
              </span>
            )}
            {ownerId && selectedOwner && (
              <span className="badge bg-brand-light text-brand-primary">
                Owner: {selectedOwner.name}
                <button onClick={() => setOwnerId('')} className="ml-1.5 text-brand-primary hover:text-gray-900">✕</button>
              </span>
            )}
            {search && (
              <span className="badge bg-brand-light text-brand-primary">Search: "{search}" <button onClick={() => setSearch('')} className="ml-1.5 text-brand-primary hover:text-gray-900">✕</button></span>
            )}
            {type && (
              <span className="badge bg-brand-light text-brand-primary">{type} <button onClick={() => setType('')} className="ml-1.5 text-brand-primary hover:text-gray-900">✕</button></span>
            )}
            {section && (
              <span className="badge bg-brand-light text-brand-primary">{section} <button onClick={() => setSection('')} className="ml-1.5 text-brand-primary hover:text-gray-900">✕</button></span>
            )}
            {status && status !== 'NEEDS_RESPONSE' && (
              <span className="badge bg-brand-light text-brand-primary">{currentStatusLabel} <button onClick={() => setStatus('NEEDS_RESPONSE')} className="ml-1.5 text-brand-primary hover:text-gray-900">✕</button></span>
            )}
            <button onClick={clearAllFilters} className="text-xs text-accent-orange hover:text-[#c44719] ml-2 font-medium">
              Clear all
            </button>
          </motion.div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText size={18} className="text-brand-primary" />
            Loop
          </h2>
          <span className="text-xs font-bold bg-gray-100 text-gray-700 px-3 py-1 rounded-full border border-gray-200">
            {stats.totalActive} open · {stats.myActiveTasks} need your answer
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAuthorId(authorId ? '' : String(user?.id))}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
              authorId ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            My Posts
          </button>
          
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setViewMode('LIST')}
              className={`text-xs font-bold px-3 py-1 rounded-md transition-colors ${viewMode === 'LIST' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`text-xs font-bold px-3 py-1 rounded-md transition-colors ${viewMode === 'KANBAN' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Kanban
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : feed.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <EmptyState
            icon={<Inbox size={28} strokeWidth={1.5} className="text-brand-primary" />}
            title={hasActiveFilters ? "Nothing matches these filters" : "The board is quiet"}
            description={
              hasActiveFilters
                ? "Loosen or clear a filter to see more posts."
                : "A half-formed thought beats one kept in your head. Post the first one."
            }
            action={
              hasActiveFilters ? (
                <button onClick={clearAllFilters} className="btn-secondary">Clear filters</button>
              ) : (
                <button onClick={() => setShowModal(true)} className="btn-primary">
                  <Plus size={16} /> Post to Loop
                </button>
              )
            }
          />
        </motion.div>
      ) : viewMode === 'KANBAN' ? (
        <motion.div 
          className="flex gap-4 overflow-x-auto pb-4 snap-x"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {['OPEN', 'DISCUSSING', 'RESOLVED'].map((colStatus) => {
            const colPosts = feed.filter((p) => p.status === colStatus);
            return (
              <div key={colStatus} className="flex-none w-80 bg-gray-50/50 rounded-2xl p-4 border border-surface-border snap-start flex flex-col max-h-[70vh]">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex justify-between items-center">
                  {colStatus}
                  <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">{colPosts.length}</span>
                </h3>
                <div className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                  {colPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onReact={(id, emoji) => reactToPost(id, emoji)}
                      onEdit={(p) => setEditingPost(p)}
                      onDelete={(id) => deletePost(id)}
                    />
                  ))}
                  {colPosts.length === 0 && (
                    <div className="text-center py-10 text-xs text-gray-400 font-medium border-2 border-dashed border-gray-200 rounded-xl">
                      No {colStatus.toLowerCase()} posts
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      ) : (
        <motion.div 
          className="space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {feed.map((post) => (
            <motion.div key={post.id} variants={itemVariants}>
              <PostCard
                post={post}
                onReact={(id, emoji) => reactToPost(id, emoji)}
                onEdit={(p) => setEditingPost(p)}
                onDelete={(id) => deletePost(id)}
              />
            </motion.div>
          ))}
          
          {hasMore && (
            <motion.div variants={itemVariants} className="flex justify-center pt-6">
              <button 
                onClick={() => fetchMoreFeed()} 
                className="btn-secondary px-8 shadow-glass"
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <Loader size={16} /> Loading...
                  </span>
                ) : 'Load More'}
              </button>
            </motion.div>
          )}
        </motion.div>
      )}

      <CreatePostModal isOpen={showModal} onClose={() => setShowModal(false)} />
      <CreatePostModal
        isOpen={Boolean(editingPost)}
        onClose={() => setEditingPost(null)}
        post={editingPost}
      />
    </div>
  );
};

export default FeedPage;
