import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import { useAuth } from '../contexts/AuthContext'

export default function LoginScreen() {
  const { login, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Enter email and password')
      return
    }
    setLoading(true)
    try {
      if (isSignUp) await signUp(email.trim(), password)
      else await login(email.trim(), password)
    } catch (e) {
      Alert.alert(
        isSignUp ? 'Sign up failed' : 'Login failed',
        e instanceof Error ? e.message : 'Unknown error',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>GymBuddy</Text>
      <Text style={styles.subtitle}>Sign in to track your workouts</Text>
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="Email (same as web)"
        keyboardType="email-address"
        placeholderTextColor="#a8a29e"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#a8a29e"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {isSignUp ? 'Sign up' : 'Log in'}
          </Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.switchAuth}
        onPress={() => setIsSignUp((v) => !v)}
        disabled={loading}
      >
        <Text style={styles.switchAuthText}>
          {isSignUp
            ? 'Already have an account? Log in'
            : "Don't have an account? Sign up"}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#c9a882',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#1c1917',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#78716c',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#44403c',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#f59e0b',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  switchAuth: {
    marginTop: 20,
    paddingVertical: 12,
  },
  switchAuthText: {
    color: '#78716c',
    fontSize: 14,
    textAlign: 'center',
  },
})
