import { useAuth } from "@clerk/clerk-react";
import type { Profile, Like, Match, Message } from "../types";

// ─── User API (Clerk JWT auto-injected) ──────────────────────────────────────

export function useApi() {
  const { getToken } = useAuth();

  async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await getToken();
    const res = await fetch(`/api${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Request failed");
    return data as T;
  }

  return {
    // Profile
    me:          ()                             => req<Profile>("GET",    "/me"),
    sync:        (data: unknown)                => req<Profile>("POST",   "/sync", data),
    updateMe:    (data: unknown)                => req<{ ok: boolean }>("PATCH",  "/me", data),
    deleteMe:    ()                             => req<{ ok: boolean }>("DELETE", "/me"),

    // Feed
    feed: (params: Record<string, string | number | undefined> = {}) => {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
      );
      return req<{ profiles: Profile[] }>("GET", `/feed?${qs}`);
    },

    // Likes
    like:     (data: unknown)                  => req<{ isMatch: boolean; matchId?: string }>("POST", "/likes", data),
    received: ()                               => req<{ likes: Like[] }>("GET", "/likes/received"),
    resolve:  (id: string, action: string)     => req<{ ok: boolean; matched: boolean }>("POST", `/likes/${id}/resolve`, { action }),

    // Matches
    matches:  ()                               => req<{ matches: Match[] }>("GET", "/matches"),
    unmatch:  (id: string)                     => req<{ ok: boolean }>("DELETE", `/matches/${id}`),

    // Messages
    messages:    (matchId: string)             => req<{ messages: Message[] }>("GET", `/matches/${matchId}/messages`),
    sendMessage: (matchId: string, data: unknown) => req<Message>("POST", `/matches/${matchId}/messages`, data),

    // Reports
    report: (data: unknown) => req<{ ok: boolean }>("POST", "/reports", data),
  };
}

// ─── Admin API (static token from env) ───────────────────────────────────────

export function useAdminApi(token: string) {
  async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`/api${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Request failed");
    return data as T;
  }

  return {
    users:     ()                             => req<{ users: any[] }>("GET", "/admin/users"),
    setStatus: (id: string, status: string)  => req<{ ok: boolean }>("PATCH", `/admin/users/${id}`, { status }),
  };
}
