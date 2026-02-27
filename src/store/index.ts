import { create } from 'zustand';
import { User, SystemSettings } from '@/types';

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;

  // System Settings
  settings: SystemSettings | null;
  setSettings: (settings: SystemSettings) => void;

  // UI State
  currentView: string;
  setCurrentView: (view: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),

  // System Settings
  settings: null,
  setSettings: (settings) => set({ settings }),

  // UI State
  currentView: 'dashboard',
  setCurrentView: (currentView) => set({ currentView }),
  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
