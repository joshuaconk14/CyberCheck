'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/api'

interface User {
  id: number
  username: string
  email: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      const userData = await authAPI.verifyToken(token)
      setUser(userData.user)
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password)
      localStorage.setItem('token', response.token)
      setUser(response.user)
      router.push('/dashboard')
    } catch (error) {
      throw error
    }
  }

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await authAPI.register(username, email, password)
      // Auto-login after registration
      await login(email, password)
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    router.push('/')
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
