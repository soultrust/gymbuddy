import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiRequest } from '../api/client'

const TOKEN_KEY = '@gymbuddy_token'

type AuthContextType = {
  token: string | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY).then((stored) => {
      setToken(stored)
      setIsLoading(false)
    })
  }, [])

  const login = async (username: string, password: string) => {
    const data = await apiRequest<{ token: string }>('/auth/token/', {
      method: 'POST',
      body: { username, password },
    })
    await AsyncStorage.setItem(TOKEN_KEY, data.token)
    setToken(data.token)
  }

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY)
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
