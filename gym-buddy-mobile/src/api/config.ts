import { Platform } from 'react-native'
import Constants from 'expo-constants'

// Get API host: use EXPO_PUBLIC_API_HOST, or dev server host (physical device), or emulator/simulator defaults
const getBaseUrl = () => {
  if (!__DEV__) return 'https://your-api.com'

  const envHost =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_HOST
  if (envHost)
    return `http://${String(envHost)
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')}:8000`

  const hostUri = Constants.expoConfig?.hostUri as string | undefined
  if (hostUri) {
    const host = hostUri.split(':')[0]
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:8000`
    }
  }

  return Platform.OS === 'android'
    ? 'http://10.0.2.2:8000' // Android emulator
    : 'http://localhost:8000' // iOS simulator
}

export const API_BASE_URL = `${getBaseUrl()}/api/v1`
