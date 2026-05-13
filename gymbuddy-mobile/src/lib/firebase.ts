// ─── Firebase config ─────────────────────────────────────────────────────────
// Keep in sync with gymbuddy-web/src/lib/firebase.ts.
// firebaseConfig must be identical in both files so web and mobile share the
// same Firebase project, users, and auth tokens.
// ─────────────────────────────────────────────────────────────────────────────
import { initializeApp } from 'firebase/app'
import type { Auth } from 'firebase/auth'
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage'

// Use @firebase/auth so Metro picks the RN build (includes getReactNativePersistence)
const {
  initializeAuth,
  getReactNativePersistence,
}: typeof import('@firebase/auth') & {
  getReactNativePersistence: (
    s: import('@firebase/auth').ReactNativeAsyncStorage
  ) => import('@firebase/auth').Persistence
} = require('@firebase/auth')

const firebaseConfig = {
  apiKey: 'AIzaSyAW9zdx8-K1pvRRy8SLVqy2vIWyY6Mm-x0',
  authDomain: 'soultrust-gymbuddy.firebaseapp.com',
  projectId: 'soultrust-gymbuddy',
  storageBucket: 'soultrust-gymbuddy.firebasestorage.app',
  messagingSenderId: '1038994855355',
  appId: '1:1038994855355:web:211f1105f6f7449d16609e',
  measurementId: 'G-QX7TRZEW4Y',
}

export const app = initializeApp(firebaseConfig)
export const auth: Auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
})
