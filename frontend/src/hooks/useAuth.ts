import { useState, useEffect } from "react"
import { useAuthStore } from "@/store/authStore"

export function useAuth() {
  const { user, token, isAuthenticated, isLoading, logout, fetchMe, loginWithFirebase } = useAuthStore()
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        await fetchMe()
      }
      setInitializing(false)
    }
    initAuth()
  }, [])

  return {
    user,
    token,
    isAuthenticated,
    isLoading: isLoading || initializing,
    logout,
    fetchMe,
    loginWithFirebase,
  }
}
