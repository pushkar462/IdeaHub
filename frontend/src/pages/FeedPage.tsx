import React, { useEffect, useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { Search, Filter, FileText, Plus } from 'lucide-react';
import api from '@/api/axios';
import { usePostStore } from '@/stores/post.store';
import PostCard from '@/components/posts/PostCard';
import CreatePostModal from '@/components/posts/CreatePostModal';
import Loader from '@/components/shared/Loader';
import EmptyState from '@/components/shared/EmptyState';
import { Post, User } from '@/types';

const TYPES = ['QUESTION', 'PROBLEM', 'IDEA'];
const SECTIONS = ['BILLS', 'INVOICING', 'PATIENTS', 'CASES', 'PARTNERS', 'HOSPITALS', 'DOCTORS', 'WHATSAPP', 'PLATFORM', 'GENERAL'];
const STATUSES = ['OPEN', 'DISCUSSING', 'RESOLVED'];

const FeedPage: React.FC = () => {
  const { feed, loading, hasMore, loadingMore, fetchFeed, fetchMoreFeed, reactToPost, deletePost, totalPosts } = usePostStore();
  const [search, setSearch]     = useState('');
  const [type, setType]         = useState('');
  const [section, setSection]   = useState('');
  const [status, setStatus]     = useState('');
  const [ownerId, setOwnerId]   = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  
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
    fetchFeed({
      search,
      type,
      section,
      status,
      ownerId: ownerId ? Number(ownerId) : undefined,
    });
  }, [search, type, section, status, ownerId]);

  const hasActiveFilters = type || section || status || search || ownerId;
  const selectedOwner = owners.find((c) => String(c.id) === ownerId);

  const clearAllFilters = () => {
    setSearch('');
    setType('');
    setSection('');
    setStatus('');
    setOwnerId('');
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
            placeholder="Search feed using full-text TSVector index..."
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
            className="input flex-1 min-w-[130px] bg-gray-50" 
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
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
            {status && (
              <span className="badge bg-brand-light text-brand-primary">{status} <button onClick={() => setStatus('')} className="ml-1.5 text-brand-primary hover:text-gray-900">✕</button></span>
            )}
            <button onClick={clearAllFilters} className="text-xs text-accent-orange hover:text-[#c44719] ml-2 font-medium">
              Clear all
            </button>
          </motion.div>
        )}
      </div>

      <div className="flex items-center justify-between px-2">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText size={18} className="text-brand-primary" />
          Active Feed
        </h2>
        <span className="text-xs font-medium text-brand-primary bg-brand-light px-2.5 py-1 rounded-full">
          {totalPosts} {totalPosts === 1 ? 'post' : 'posts'}
        </span>
      </div>

      {loading ? (
        <Loader />
      ) : feed.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <EmptyState
            icon="✨"
            title={hasActiveFilters ? "No matches found" : "Your feed is empty"}
            description={
              hasActiveFilters
                ? "Try adjusting your filters to see more posts."
                : "Be the first to start a conversation or log an issue."
            }
            action={
              hasActiveFilters ? (
                <button onClick={clearAllFilters} className="btn-secondary">Clear Filters</button>
              ) : (
                <button onClick={() => setShowModal(true)} className="btn-primary">
                  <Plus size={16} /> Create Post
                </button>
              )
            }
          />
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
