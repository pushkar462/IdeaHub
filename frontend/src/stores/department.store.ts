import { create } from 'zustand';
import api from '@/api/axios';

export interface Department {
  id: number;
  name: string;
  slug: string;
  description: string;
}

interface DepartmentState {
  departments: Department[];
  loading: boolean;
  fetched: boolean;
  fetchDepartments: () => Promise<void>;
}

export const useDepartmentStore = create<DepartmentState>((set, get) => ({
  departments: [],
  loading: false,
  fetched: false,

  fetchDepartments: async () => {
    // Aggressive cache: only fetch once per session
    if (get().fetched || get().loading) return;

    set({ loading: true });
    try {
      const { data } = await api.get('/departments');
      set({ departments: data, loading: false, fetched: true });
    } catch (err) {
      console.error('Failed to fetch departments', err);
      set({ loading: false });
    }
  },
}));
