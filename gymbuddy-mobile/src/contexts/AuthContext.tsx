import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { apiRequest } from '../api/client'

const TOKEN_KEY = '@gymbuddy_token'
const EMAIL_KEY = '@gymbuddy_email'

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
    Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(EMAIL_KEY),
    ]).then(([storedToken, storedEmail]) => {
      setToken(storedToken)
      setUserEmail(storedEmail)
      setIsLoading(false)
    })
  }, [])

  const login = async (email: string, password: string) => {
    setAuthError(null)
    const userCred = await signInWithEmailAndPassword(auth, email, password)
    const idToken = await userCred.user.getIdToken()
    const djangoToken = await exchangeFirebaseToken(idToken)
    const savedEmail = userCred.user.email ?? email
    await AsyncStorage.multiSet([
      [TOKEN_KEY, djangoToken],
      [EMAIL_KEY, savedEmail],
    ])
    setToken(djangoToken)
    setUserEmail(savedEmail)
  }

  const signUp = async (email: string, password: string) => {
    setAuthError(null)
    const userCred = await createUserWithEmailAndPassword(auth, email, password)
    const idToken = await userCred.user.getIdToken()
    const djangoToken = await exchangeFirebaseToken(idToken)
    const savedEmail = userCred.user.email ?? email
    await AsyncStorage.multiSet([
      [TOKEN_KEY, djangoToken],
      [EMAIL_KEY, savedEmail],
    ])
    setToken(djangoToken)
    setUserEmail(savedEmail)
  }

  const logout = async () => {
    await firebaseSignOut(auth)
    await AsyncStorage.multiRemove([TOKEN_KEY, EMAIL_KEY])
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
