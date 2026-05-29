import { create } from 'zustand';
import api from '@/api/axios';
import { Post } from '@/types';

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
  fetchFeed: (filters?: PostFilters) => Promise<void>;
  fetchPost: (id: number) => Promise<void>;
  createPost: (payload: FormData | Record<string, unknown>) => Promise<Post>;
  updateStatus: (id: number, status: string) => Promise<void>;
  deletePost: (id: number) => Promise<void>;
  reactToPost: (id: number, emoji: string) => Promise<void>;
}

export const usePostStore = create<PostState>((set, get) => ({
  feed: [],
  current: null,
  loading: false,

  fetchFeed: async (filters = {}) => {
    set({ loading: true });
    try {
      const { data } = await api.get('/posts', { params: filters });
      set({ feed: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchPost: async (id) => {
    set({ loading: true });
    try {
      const { data } = await api.get(`/posts/${id}`);
      set({ current: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createPost: async (payload) => {
    const { data } = await api.post('/posts', payload);
    await get().fetchFeed();
    return data;
  },

  updateStatus: async (id, status) => {
    await api.patch(`/posts/${id}/status`, { status });
    await get().fetchFeed();
    if (get().current?.id === id) await get().fetchPost(id);
  },

  deletePost: async (id) => {
    await api.delete(`/posts/${id}`);
    set((s) => ({ feed: s.feed.filter((p) => p.id !== id) }));
  },

  reactToPost: async (id, emoji) => {
    await api.post(`/posts/${id}/react`, { emoji });
    if (get().current?.id === id) await get().fetchPost(id);
    else await get().fetchFeed();
  },
}));
