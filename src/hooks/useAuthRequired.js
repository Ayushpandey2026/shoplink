// src/hooks/useAuthRequired.js — Hook for protecting specific operations
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import toast from 'react-hot-toast'

/**
 * Hook to protect operations that require authentication
 * If user is not authenticated, redirects to login with a message
 * Returns true if user is authenticated, false otherwise
 */
export const useAuthRequired = () => {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  const checkAuth = (operationName = 'operation') => {
    if (!isAuthenticated) {
      toast.error(`Please login to ${operationName}`)
      navigate('/auth/login', { state: { from: window.location.pathname } })
      return false
    }
    return true
  }

  return { isAuthenticated, checkAuth }
}
