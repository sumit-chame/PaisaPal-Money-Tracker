import { create } from 'zustand'
import { db } from '../lib/db'
import type { ThemeMode, Settings, Transaction } from '../lib/db'

/* ─── Theme Store ─────────────────────────── */

interface ThemeState {
  theme: ThemeMode
  resolvedTheme: 'dark' | 'light'
  setTheme: (t: ThemeMode) => void
  _syncResolved: () => void
}

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: 'dark' | 'light') {
  document.documentElement.setAttribute('data-theme', resolved)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0B0D12' : '#F5F6FA')
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  resolvedTheme: 'dark',

  setTheme: async (t) => {
    set({ theme: t })
    await db.settings.update(1, { theme: t })
    get()._syncResolved()
  },

  _syncResolved: () => {
    const { theme } = get()
    const resolved = theme === 'system' ? getSystemTheme() : theme
    set({ resolvedTheme: resolved })
    applyTheme(resolved)
  },
}))

/* ─── Settings Store ─────────────────────── */

interface SettingsState {
  settings: Settings | null
  loadSettings: () => Promise<void>
  updateSettings: (patch: Partial<Settings>) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,

  loadSettings: async () => {
    const s = await db.settings.get(1)
    if (s) {
      set({ settings: s })
      const { _syncResolved, setTheme: _set } = useThemeStore.getState()
      useThemeStore.setState({ theme: s.theme })
      _syncResolved()
    }
  },

  updateSettings: async (patch) => {
    await db.settings.update(1, patch)
    const s = await db.settings.get(1)
    if (s) set({ settings: s })
  },
}))

/* ─── Navigation Store ────────────────────── */

export type TabId = 'home' | 'insights' | 'add' | 'budgets' | 'me'

interface NavState {
  activeTab: TabId
  isAddSheetOpen: boolean
  editingTransaction: Transaction | null
  setActiveTab: (t: TabId) => void
  openAddSheet: (txn?: unknown) => void
  closeAddSheet: () => void
}

export const useNavStore = create<NavState>((set) => ({
  activeTab: 'home',
  isAddSheetOpen: false,
  editingTransaction: null,
  setActiveTab: (t) => set({ activeTab: t }),
  openAddSheet: (txn) => {
    const isTxn = Boolean(txn && typeof txn === 'object' && 'id' in (txn as object) && 'amount' in (txn as object))
    set({ isAddSheetOpen: true, editingTransaction: isTxn ? (txn as Transaction) : null })
  },
  closeAddSheet: () => set({ isAddSheetOpen: false, editingTransaction: null }),
}))

/* ─── Toast Store ─────────────────────────── */

export interface Toast {
  id: string
  message: string
  type?: 'success' | 'error' | 'info'
  action?: { label: string; fn: () => void }
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (t: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (t) => {
    const id = Math.random().toString(36).slice(2)
    set({ toasts: [...get().toasts, { ...t, id }] })
    const duration = t.duration ?? 4000
    setTimeout(() => get().removeToast(id), duration)
    return id
  },

  removeToast: (id) => {
    set({ toasts: get().toasts.filter(t => t.id !== id) })
  },
}))
