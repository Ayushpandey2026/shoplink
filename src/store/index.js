// src/store/index.js — Zustand global state management
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Auth Store ────────────────────────────────────────────────────
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isSeller: false,

      setAuth: ({ user, accessToken, refreshToken }) => {
        localStorage.setItem('shoplink_token', accessToken)
        if (refreshToken) localStorage.setItem('shoplink_refresh_token', refreshToken)
        set({
          user,
          token: accessToken,
          refreshToken,
          isAuthenticated: true,
          isSeller: user?.role === 'seller' || user?.role === 'admin',
        })
      },

      updateUser: (userData) => set((state) => ({
        user: { ...state.user, ...userData },
        isSeller: (userData.role || state.user?.role) === 'seller'
          || (userData.role || state.user?.role) === 'admin'
          || Boolean(userData.shop || state.user?.shop),
      })),

      logout: () => {
        localStorage.removeItem('shoplink_token')
        localStorage.removeItem('shoplink_refresh_token')
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isSeller: false })
      },
    }),
    {
      name: 'shoplink-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        isSeller: state.isSeller,
      }),
    }
  )
)

// ── UI Store ──────────────────────────────────────────────────────
export const useUIStore = create((set) => ({
  theme: localStorage.getItem('shoplink_theme') || 'light',
  language: localStorage.getItem('shoplink_lang') || 'en',
  sidebarOpen: false,
  unreadNotifications: 0,
  unreadMessages: 0,

  setTheme: (theme) => {
    localStorage.setItem('shoplink_theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
    set({ theme })
  },

  setLanguage: (lang) => {
    localStorage.setItem('shoplink_lang', lang)
    set({ language: lang })
  },

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setUnreadNotifications: (count) => set({ unreadNotifications: count }),
  setUnreadMessages: (count) => set({ unreadMessages: count }),
  incrementMessages: () => set((s) => ({ unreadMessages: s.unreadMessages + 1 })),
  incrementNotifications: () => set((s) => ({ unreadNotifications: s.unreadNotifications + 1 })),
}))

// ── Location Store ────────────────────────────────────────────────
export const useLocationStore = create((set) => ({
  latitude: null,
  longitude: null,
  city: null,
  error: null,
  loading: false,

  setLocation: ({ latitude, longitude, city }) => set({ latitude, longitude, city, error: null }),
  setError: (error) => set({ error, loading: false }),
  setLoading: (loading) => set({ loading }),

  requestLocation: () => {
    set({ loading: true })
    if (!navigator.geolocation) {
      set({ error: 'Geolocation not supported', loading: false })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => set({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        loading: false,
        error: null,
      }),
      (err) => set({ error: err.message, loading: false })
    )
  },
}))

// ── Notification Store ────────────────────────────────────────────
export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => set((s) => ({
    notifications: [notification, ...s.notifications].slice(0, 50),
    unreadCount: s.unreadCount + 1,
  })),

  setNotifications: (notifications) => set({ notifications }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  markAllRead: () => set({ unreadCount: 0 }),
}))

// ── Cart / Order Flow Store ───────────────────────────────────────
export const useOrderStore = create((set) => ({
  currentOrder: null,
  razorpayData: null,

  setCurrentOrder: (order) => set({ currentOrder: order }),
  setRazorpayData: (data) => set({ razorpayData: data }),
  clearOrder: () => set({ currentOrder: null, razorpayData: null }),
}))
