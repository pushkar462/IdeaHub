import { create } from 'zustand';
import api from '@/api/axios';
import { Post } from '@/types';
import toast from 'react-hot-toast';

interface PostFilters {
  search?: string;
  status?: string;
  category?: string;
  priority?: string;
  assigneeId?: number;
}

interface PostState {
  feed: Post[];
  current: Post | null;
  loading: boolean;
  lastFilters: PostFilters;
  fetchFeed: (filters?: PostFilters) => Promise<void>;
  fetchPost: (id: number, background?: boolean) => Promise<void>;
  createPost: (payload: FormData | Record<string, unknown>) => Promise<Post>;
  updateStatus: (id: number, status: string) => Promise<void>;
  deletePost: (id: number) => Promise<void>;
  reactToPost: (id: number, emoji: string) => Promise<void>;
  optimisticUpdate: (id: number, updates: Partial<Post>) => void;
}

export const usePostStore = create<PostState>((set, get) => ({
  feed: [],
  current: null,
  loading: false,
  lastFilters: {},

  fetchFeed: async (filters = {}) => {
    set({ loading: true, lastFilters: filters });
    
    // Clean empty strings and undefined/null values
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );

    try {
      const { data } = await api.get('/posts', { params: cleanFilters });
      set({ feed: Array.isArray(data) ? data : (data?.items || []), loading: false });
    } catch {
      set({ loading: false });
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

  createPost: async (payload) => {
    const { data } = await api.post('/posts', payload);
    await get().fetchFeed(get().lastFilters);
    return data;
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

  optimisticUpdate: (id, updates) => {
    set((s) => ({
      feed: s.feed.map((p) => (p.id === id ? { ...p, ...updates } as Post : p)),
      current: s.current?.id === id ? { ...s.current, ...updates } as Post : s.current,
    }));
  },
}));
