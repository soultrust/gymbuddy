import { API_BASE_URL } from './config'

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: object
  token?: string | null
}

const REQUEST_TIMEOUT_MS = 45_000

export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, token }: RequestOptions = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Token ${token}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch (e) {
    clearTimeout(timeoutId)
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(
        `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s (${url})`,
      )
    }
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(
      `Network error (${msg}). Check API URL, Wi‑Fi, and that Django is on 0.0.0.0:8000 for a phone.`,
    )
  }
  clearTimeout(timeoutId)

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      data?.detail ||
      data?.non_field_errors?.[0] ||
      JSON.stringify(data) ||
      res.statusText
    const err = new Error(message) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return data
}
