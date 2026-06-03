import { create } from 'zustand';
import api from '@/api/axios';
import { User } from '@/types';
import { SocketManager } from '@/lib/socket/socket-manager';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    role: string;
    bio?: string;
  }) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      SocketManager.connect(data.token);
      set({ token: data.token, user: data.user, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  register: async (formData) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/register', formData);
      localStorage.setItem('token', data.token);
      SocketManager.connect(data.token);
      set({ token: data.token, user: data.user, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    SocketManager.disconnect();
    set({ token: null, user: null });
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me');
      const token = get().token;
      if (token) SocketManager.connect(token);
      set({ user: data });
    } catch {
      localStorage.removeItem('token');
      SocketManager.disconnect();
      set({ token: null, user: null });
    }
  },
}));
