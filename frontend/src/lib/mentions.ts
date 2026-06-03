import api from '@/api/axios';

let debounceTimeout: number;

export const fetchUsersForMention = (query: string, callback: (data: any[]) => void) => {
  if (!query) return callback([]);

  window.clearTimeout(debounceTimeout);
  debounceTimeout = window.setTimeout(async () => {
    try {
      const { data } = await api.get('/auth/users', { params: { search: query } });
      const suggestions = data.map((user: any) => ({
        id: user.name.replace(/\s+/g, ''), // Mentions uses the id directly in text, better to use a string
        display: user.name,
      }));
      callback(suggestions);
    } catch (err) {
      console.error('Failed to fetch users for mention', err);
      callback([]);
    }
  }, 300); // 300ms debounce
};
