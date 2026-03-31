import { create } from "zustand"
import api from "@/api/client"

interface User {
  id: string
  email: string
  name: string
  profile_picture: string | null
  role: "admin" | "doctor" | "patient"
  phone: string | null
  is_active: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  hasHydrated: boolean
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  loginWithFirebase: (idToken: string, role?: "patient" | "doctor") => Promise<User>
  logout: () => void
  fetchMe: () => Promise<void>
  initializeAuth: () => Promise<void>
}

let authInitializationPromise: Promise<void> | null = null

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem("token"),
  isAuthenticated: !!localStorage.getItem("token"),
  isLoading: false,
  hasHydrated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setToken: (token) => {
    if (token) {
      localStorage.setItem("token", token)
      set({ token, isAuthenticated: true, hasHydrated: false })
    } else {
      localStorage.removeItem("token")
      set({ token: null, isAuthenticated: false, hasHydrated: true })
    }
  },

  loginWithFirebase: async (idToken: string, role?: "patient" | "doctor") => {
    set({ isLoading: true })
    try {
      const response = await api.post("/api/v1/auth/firebase-login", { id_token: idToken, role })
      const { token, user } = response.data.data
      localStorage.setItem("token", token)
      set({ token, user, isAuthenticated: true, hasHydrated: true })
      return user
    } catch (err: any) {
      throw new Error(err.response?.data?.detail?.message || "Login failed")
    } finally {
      set({ isLoading: false })
    }
  },

  logout: () => {
    localStorage.removeItem("token")
    authInitializationPromise = null
    set({ user: null, token: null, isAuthenticated: false, isLoading: false, hasHydrated: true })
  },

  fetchMe: async () => {
    const token = get().token
    if (!token) return

    // Don't toggle global isLoading when we already have a user (e.g. after login, or a
    // second useAuth() instance mounts — Sidebar used to call fetchMe and set isLoading true,
    // which made ProtectedRoute unmount the outlet → remount Sidebar → loop).
    const showLoading = !get().user
    if (showLoading) set({ isLoading: true })
    try {
      const response = await api.get("/api/v1/auth/me")
      set({ user: response.data.data, isAuthenticated: true })
    } catch {
      get().logout()
    } finally {
      if (showLoading) set({ isLoading: false })
    }
  },

  initializeAuth: async () => {
    if (get().hasHydrated) return

    const token = get().token
    if (!token) {
      set({ hasHydrated: true, isAuthenticated: false, user: null })
      return
    }

    if (authInitializationPromise) {
      await authInitializationPromise
      return
    }

    authInitializationPromise = (async () => {
      try {
        await get().fetchMe()
      } finally {
        set({ hasHydrated: true })
        authInitializationPromise = null
      }
    })()

    await authInitializationPromise
  },
}))
