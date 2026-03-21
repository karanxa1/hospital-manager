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
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  loginWithFirebase: (idToken: string) => Promise<User>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem("token"),
  isAuthenticated: !!localStorage.getItem("token"),
  isLoading: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setToken: (token) => {
    if (token) {
      localStorage.setItem("token", token)
      set({ token, isAuthenticated: true })
    } else {
      localStorage.removeItem("token")
      set({ token: null, isAuthenticated: false })
    }
  },

  loginWithFirebase: async (idToken: string) => {
    set({ isLoading: true })
    try {
      const response = await api.post("/api/v1/auth/firebase-login", { id_token: idToken })
      const { token, user } = response.data.data
      localStorage.setItem("token", token)
      set({ token, user, isAuthenticated: true })
      return user
    } catch (err: any) {
      throw new Error(err.response?.data?.detail?.message || "Login failed")
    } finally {
      set({ isLoading: false })
    }
  },

  logout: () => {
    localStorage.removeItem("token")
    set({ user: null, token: null, isAuthenticated: false, isLoading: false })
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
}))
