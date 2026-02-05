const API_BASE_URL = "http://localhost:8000/api/v1";

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

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      data?.detail ||
      data?.non_field_errors?.[0] ||
      (typeof data === "object" ? JSON.stringify(data) : data) ||
      res.statusText;
    throw new Error(message);
  }
  return data;
}
