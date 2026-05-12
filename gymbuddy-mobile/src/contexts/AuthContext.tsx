import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { apiRequest } from '../api/client'

const TOKEN_KEY = '@gymbuddy_token'

async function exchangeFirebaseToken(idToken: string): Promise<string> {
  const data = await apiRequest<{ token: string }>('/auth/firebase-token/', {
    method: 'POST',
    body: { id_token: idToken },
    token: undefined,
  })
  return data.token
}

type AuthContextType = {
  token: string | null
  userEmail: string | null
  isLoading: boolean
  authError: string | null
  clearAuthError: () => void
  login: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthError(null)
      if (user) {
        try {
          const idToken = await user.getIdToken()
          const djangoToken = await exchangeFirebaseToken(idToken)
          await AsyncStorage.setItem(TOKEN_KEY, djangoToken)
          setToken(djangoToken)
          setUserEmail(user.email)
        } catch (err) {
          setToken(null)
          await AsyncStorage.removeItem(TOKEN_KEY)
          setUserEmail(user.email)
          setAuthError(
            err instanceof Error
              ? err.message
              : 'Could not connect to server. Is the API running?'
          )
        }
      } else {
        await AsyncStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUserEmail(null)
      }
      setIsLoading(false)
    })
    return () => unsub()
  }, [])

  const login = async (email: string, password: string) => {
    setAuthError(null)
    await signInWithEmailAndPassword(auth, email, password)
    // onAuthStateChanged handles the Django token exchange
  }

  const signUp = async (email: string, password: string) => {
    setAuthError(null)
    await createUserWithEmailAndPassword(auth, email, password)
    // onAuthStateChanged handles the Django token exchange
  }

  const logout = async () => {
    await firebaseSignOut(auth)
    await AsyncStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUserEmail(null)
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        userEmail,
        isLoading,
        authError,
        clearAuthError: () => setAuthError(null),
        login,
        signUp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
