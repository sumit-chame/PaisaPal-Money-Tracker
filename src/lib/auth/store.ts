import { create } from 'zustand';
import { authApi, type AuthUser } from './api';

export type AuthStatus = 'guest' | 'signedIn';

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateName: (name: string) => Promise<{ ok: boolean; error?: string }>;
  changePassword: (currentPass: string, newPass: string) => Promise<{ ok: boolean; error?: string }>;
  deleteAccount: (password: string) => Promise<{ ok: boolean; error?: string }>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'guest',
  isLoading: false,
  isInitialized: false,
  error: null,

  clearError: () => set({ error: null }),

  checkAuth: async () => {
    try {
      const res = await authApi.getMe();
      if (res.ok && res.user) {
        set({ user: res.user, status: 'signedIn', isInitialized: true, error: null });
      } else {
        set({ user: null, status: 'guest', isInitialized: true });
      }
    } catch {
      set({ user: null, status: 'guest', isInitialized: true });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    const res = await authApi.login(email, password);
    if (res.ok && res.user) {
      set({ user: res.user, status: 'signedIn', isLoading: false, error: null });
      return { ok: true };
    }
    const err = res.error || 'Login failed';
    set({ isLoading: false, error: err });
    return { ok: false, error: err };
  },

  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true, error: null });
    const res = await authApi.register(name, email, password);
    if (res.ok && res.user) {
      set({ user: res.user, status: 'signedIn', isLoading: false, error: null });
      return { ok: true };
    }
    const err = res.error || 'Registration failed';
    set({ isLoading: false, error: err });
    return { ok: false, error: err };
  },

  logout: async () => {
    set({ isLoading: true });
    await authApi.logout();
    set({ user: null, status: 'guest', isLoading: false, error: null });
  },

  updateName: async (name: string) => {
    set({ isLoading: true, error: null });
    const res = await authApi.updateName(name);
    if (res.ok && res.user) {
      set({ user: res.user, isLoading: false, error: null });
      return { ok: true };
    }
    const err = res.error || 'Failed to update name';
    set({ isLoading: false, error: err });
    return { ok: false, error: err };
  },

  changePassword: async (currentPass: string, newPass: string) => {
    set({ isLoading: true, error: null });
    const res = await authApi.changePassword(currentPass, newPass);
    set({ isLoading: false, error: res.error || null });
    if (res.ok) {
      return { ok: true };
    }
    return { ok: false, error: res.error || 'Failed to change password' };
  },

  deleteAccount: async (password: string) => {
    set({ isLoading: true, error: null });
    const res = await authApi.deleteAccount(password);
    if (res.ok) {
      set({ user: null, status: 'guest', isLoading: false, error: null });
      return { ok: true };
    }
    const err = res.error || 'Failed to delete account';
    set({ isLoading: false, error: err });
    return { ok: false, error: err };
  },
}));

// Automatically restore user session on startup
if (typeof window !== 'undefined') {
  useAuthStore.getState().checkAuth();
}
