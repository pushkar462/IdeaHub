import { create } from 'zustand';
import api from '@/api/axios';
import { Notification } from '@/types';

interface NotificationState {
  list: Notification[];
  unreadCount: number;
  fetch: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  addNotification: (n: Notification) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  list: [],
  unreadCount: 0,

  fetch: async () => {
    try {
      const { data } = await api.get('/notifications');
      set({
        list: data,
        unreadCount: data.filter((n: Notification) => !n.read).length,
      });
    } catch {}
  },

  markRead: async (id) => {
    await api.patch(`/notifications/${id}/read`);
    set((s) => ({
      list: s.list.map((n) => (n.id === id ? { ...n, read: true } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
  },

  markAllRead: async () => {
    await api.patch('/notifications/read-all');
    set((s) => ({
      list: s.list.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  addNotification: (n) =>
    set((s) => ({
      list: [n, ...s.list],
      unreadCount: s.unreadCount + 1,
    })),
}));
