import { create } from 'zustand';

const safeJsonParse = (str) => {
  try {
    return str && str !== 'undefined' && str !== 'null' ? JSON.parse(str) : null;
  } catch (e) {
    return null;
  }
};

const getToken = () => {
  const token = localStorage.getItem('token');
  if (!token || token === 'undefined' || token === 'null') return null;
  return token;
};

export const useAuthStore = create((set, get) => ({
  user: safeJsonParse(localStorage.getItem('user')),
  isAuthenticated: !!getToken(),
  token: getToken(),

  // RBAC helpers
  hasRole: (...roles) => roles.includes(get().user?.role),
  isAdmin: () => get().user?.role === 'ADMIN',
  isAnalyst: () => ['ADMIN', 'ANALYST'].includes(get().user?.role),

  login: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    set({ user, isAuthenticated: true, token });
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, isAuthenticated: false, token: null });
  },

  updateUser: (data) => {
    set((state) => {
      const updatedUser = { ...state.user, ...data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
  },
}));