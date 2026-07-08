import { create } from 'zustand';
import api from '@/api/axios';
import { Post } from '@/types';
import toast from 'react-hot-toast';

interface PostFilters {
  search?: string;
  status?: string;
  type?: string;
  section?: string;
  ownerId?: number;
  authorId?: number;
  needResponse?: boolean;
  campaignId?: number;
}

interface PostStats {
  totalActive: number;
  myActiveTasks: number;
  needReview: number;
  completed: number;
}

interface PostState {
  feed: Post[];
  current: Post | null;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  nextCursor: string | null;
  lastFilters: PostFilters;
  stats: PostStats;
  totalPosts: number;
  fetchFeed: (filters?: PostFilters) => Promise<void>;
  fetchMoreFeed: () => Promise<void>;
  fetchPost: (id: number, background?: boolean) => Promise<void>;
  fetchStats: () => Promise<void>;
  createPost: (payload: FormData | Record<string, unknown>) => Promise<Post>;
  updatePost: (id: number, payload: FormData) => Promise<Post>;
  updateStatus: (id: number, status: string) => Promise<void>;
  deletePost: (id: number) => Promise<void>;
  reactToPost: (id: number, emoji: string) => Promise<void>;
  votePost: (id: number) => Promise<void>;
  optimisticUpdate: (id: number, updates: Partial<Post>) => void;
}

export const usePostStore = create<PostState>((set, get) => ({
  feed: [],
  current: null,
  loading: false,
  loadingMore: false,
  hasMore: false,
  nextCursor: null,
  lastFilters: {},
  totalPosts: 0,
  stats: {
    totalActive: 0,
    myActiveTasks: 0,
    needReview: 0,
    completed: 0,
  },

  fetchFeed: async (filters = {}) => {
    // Clean empty strings and undefined/null values
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    set({ loading: true, lastFilters: cleanFilters });

    try {
      const res = await api.get('/posts', { params: cleanFilters });
      set({ 
        feed: res.data, 
        loading: false,
        hasMore: (res as any).meta?.hasMore || false,
        nextCursor: (res as any).meta?.nextCursor || null,
        totalPosts: (res as any).meta?.total ?? res.data.length
      });
      get().fetchStats();
    } catch {
      set({ loading: false });
    }
  },

  fetchMoreFeed: async () => {
    const { loadingMore, hasMore, nextCursor, lastFilters, feed } = get();
    if (loadingMore || !hasMore || !nextCursor) return;

    set({ loadingMore: true });
    try {
      const res = await api.get('/posts', { 
        params: { ...lastFilters, cursor: nextCursor } 
      });
      set({ 
        feed: [...feed, ...res.data], 
        loadingMore: false,
        hasMore: (res as any).meta?.hasMore || false,
        nextCursor: (res as any).meta?.nextCursor || null,
        totalPosts: (res as any).meta?.total ?? get().totalPosts
      });
    } catch {
      set({ loadingMore: false });
    }
  },

  fetchPost: async (id, background = false) => {
    if (!background) set({ loading: true });
    try {
      const [{ data: post }, { data: comments }] = await Promise.all([
        api.get(`/posts/${id}`),
        api.get(`/posts/${id}/comments`)
      ]);
      set({ current: { ...post, comments }, loading: false });
    } catch {
      if (!background) set({ loading: false });
    }
  },

  fetchStats: async () => {
    try {
      const { data } = await api.get('/posts/stats');
      set({ stats: data });
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  },

  createPost: async (payload) => {
    const { data } = await api.post('/posts', payload);
    await get().fetchFeed(get().lastFilters);
    return data;
  },

  updatePost: async (id, payload) => {
    try {
      const { data } = await api.patch(`/posts/${id}`, payload);
      set((s) => ({
        feed: s.feed.map((p) => (p.id === id ? { ...p, ...data } : p)),
        current: s.current?.id === id ? { ...s.current, ...data } : s.current,
      }));
      await get().fetchFeed(get().lastFilters);
      toast.success('Post updated');
      return data;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update post');
      throw error;
    }
  },

  updateStatus: async (id, status) => {
    try {
      await api.patch(`/posts/${id}/status`, { status });
      await get().fetchFeed(get().lastFilters);
      if (get().current?.id === id) await get().fetchPost(id, true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
      if (get().current?.id === id) await get().fetchPost(id); // reset state
    }
  },

  deletePost: async (id) => {
    try {
      await api.delete(`/posts/${id}`);
      set((s) => ({ feed: s.feed.filter((p) => p.id !== id) }));
      toast.success('Post deleted');
      get().fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete post');
    }
  },

  reactToPost: async (id, emoji) => {
    try {
      await api.post(`/posts/${id}/react`, { emoji });
      if (get().current?.id === id) await get().fetchPost(id, true);
      else await get().fetchFeed(get().lastFilters);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to react');
    }
  },

  votePost: async (id) => {
    // Optimistic toggle — server is the source of truth on failure.
    const current = get().feed.find((p) => p.id === id) || get().current;
    const prevHas = Boolean(current?.hasVoted);
    const prevCount = current?.voteCount ?? 0;
    get().optimisticUpdate(id, {
      hasVoted: !prevHas,
      voteCount: Math.max(0, prevCount + (prevHas ? -1 : 1)),
    });
    try {
      const { data } = await api.post(`/posts/${id}/vote`);
      get().optimisticUpdate(id, { hasVoted: !!data.hasVoted, voteCount: data.voteCount ?? 0 });
    } catch (error: any) {
      // Revert on failure
      get().optimisticUpdate(id, { hasVoted: prevHas, voteCount: prevCount });
      toast.error(error.response?.data?.message || 'Failed to vote');
    }
  },

  optimisticUpdate: (id, updates) => {
    set((s) => ({
      feed: s.feed.map((p) => (p.id === id ? { ...p, ...updates } as Post : p)),
      current: s.current?.id === id ? { ...s.current, ...updates } as Post : s.current,
    }));
  },
}));
