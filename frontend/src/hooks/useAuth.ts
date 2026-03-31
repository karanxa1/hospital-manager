import { useEffect } from "react"
import { useAuthStore } from "@/store/authStore"

export function useAuth() {
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    hasHydrated,
    logout,
    fetchMe,
    loginWithFirebase,
    initializeAuth,
  } = useAuthStore()

  useEffect(() => {
    void initializeAuth()
  }, [initializeAuth])

  return {
    user,
    token,
    isAuthenticated,
    isLoading: isLoading || !hasHydrated,
    logout,
    fetchMe,
    loginWithFirebase,
  }
}
