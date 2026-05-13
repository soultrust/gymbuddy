const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

const REQUEST_TIMEOUT_MS = 45_000;

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: object;
  token?: string | null;
};

export async function apiRequest<T>(
  path: string,
  { method = "GET", body, token }: RequestOptions = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Token ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
    }
    throw new Error(
      err instanceof Error ? err.message : "Network error — check your connection."
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      data?.detail ||
      data?.non_field_errors?.[0] ||
      (typeof data === "object" ? JSON.stringify(data) : data) ||
      res.statusText;
    const apiErr = new Error(message) as Error & { status?: number };
    apiErr.status = res.status;
    throw apiErr;
  }
  return data;
}
