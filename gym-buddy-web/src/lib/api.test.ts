import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./api";

describe("apiRequest", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, options?: RequestInit) => {
        return Promise.resolve(new Response(JSON.stringify({}), options));
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed JSON on success", async () => {
    const data = { id: 1, name: "test" };
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(JSON.stringify(data), { status: 200 })))
    );
    const result = await apiRequest("/workouts/");
    expect(result).toEqual(data);
  });

  it("throws with detail message on API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ detail: "Invalid token" }), {
            status: 401,
          })
        )
      )
    );
    await expect(apiRequest("/workouts/")).rejects.toThrow("Invalid token");
  });

  it("throws with non_field_errors when present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ non_field_errors: ["Invalid credentials"] }), {
            status: 400,
          })
        )
      )
    );
    await expect(apiRequest("/workouts/")).rejects.toThrow("Invalid credentials");
  });

  it("includes Authorization header when token provided", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
    );
    vi.stubGlobal("fetch", fetchMock);
    await apiRequest("/workouts/", { token: "abc123" });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Token abc123",
        }),
      })
    );
  });
});
