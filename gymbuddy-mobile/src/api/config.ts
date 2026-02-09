const LIVE_API_BASE = 'https://gymbuddy-api-1038994855355.us-central1.run.app'

// Get API base URL (no /api/v1). Defaults to live Cloud Run; use env to point at local API.
const getBaseUrl = (): string => {
  // Explicit override: point at a different API (e.g. local)
  const explicitUrl =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL
  if (explicitUrl) {
    return String(explicitUrl)
      .replace(/\/api\/v1\/?$/, '')
      .replace(/\/$/, '')
  }

  // Use local API only when explicitly set (e.g. EXPO_PUBLIC_API_HOST=192.168.1.x)
  const envHost =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_HOST
  if (envHost) {
    return `http://${String(envHost)
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')}:8000`
  }

  // Default: live Cloud Run (works in both dev and production)
  return LIVE_API_BASE
}

export const API_BASE_URL = `${getBaseUrl()}/api/v1`
