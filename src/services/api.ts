import type { ChatMessage, ClothingItem, Outfit, PackRequest, PackResponse, User, UserProfile } from "../types";
import { auth } from "../lib/firebase";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";
const TOKEN_KEY = "wardrobe_jwt";
let authSyncUser: User | null = null;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;

  const [, payload] = token.split(".");
  if (!payload) return true;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
    const decoded = JSON.parse(window.atob(padded)) as { exp?: unknown };
    if (typeof decoded.exp !== "number") return true;

    return decoded.exp * 1000 <= Date.now() + 30_000;
  } catch {
    return true;
  }
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function setAuthSyncUser(user: User | null) {
  authSyncUser = user;
}

function mapFirebaseUserForSync(): User | null {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email ?? "",
    displayName: firebaseUser.displayName ?? firebaseUser.email ?? "User",
    photoURL: firebaseUser.photoURL ?? undefined,
    provider: firebaseUser.providerData.some((provider) => provider.providerId === "google.com")
      ? "google"
      : "password",
    createdAt: firebaseUser.metadata.creationTime
      ? new Date(firebaseUser.metadata.creationTime).getTime()
      : undefined,
  };
}

async function refreshTokenOnce(): Promise<boolean> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return false;

  const syncUser = authSyncUser ?? mapFirebaseUserForSync();
  if (!syncUser) return false;

  try {
    await firebaseUser.getIdToken(true);
    const { token } = await syncUserRequest(syncUser);
    setToken(token);
    return true;
  } catch (error) {
    console.warn(
      "Could not refresh API token:",
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retryOnUnauthorized = true
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 204) return undefined as T;

  if (res.status === 401 && retryOnUnauthorized && path !== "/api/auth/sync") {
    const refreshed = await refreshTokenOnce();
    if (refreshed) {
      return request<T>(path, options, false);
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error ?? res.statusText, res.status);
  }
  return data as T;
}

async function syncUserRequest(user: User): Promise<{ token: string }> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    throw new Error("No Firebase user is signed in");
  }

  setAuthSyncUser(user);
  const firebaseToken = await firebaseUser.getIdToken(true);
  return request<{ token: string }>("/api/auth/sync", {
    method: "POST",
    body: JSON.stringify({ ...user, firebaseToken }),
  }, false);
}

export const api = {
  health: () => request<{ ok: boolean }>("/health"),

  register: (email: string, password: string, displayName: string) =>
    request<{ user: User; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName }),
    }),

  login: (email: string, password: string) =>
    request<{ user: User; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  google: () =>
    request<{ user: User; token: string }>("/auth/google", { method: "POST" }),

  /** Links Firebase user to API JWT for AI routes */
  syncUser: syncUserRequest,

  me: () => request<{ user: User }>("/auth/me"),

  deleteMe: () => request<void>("/auth/me", { method: "DELETE" }),

  getItems: () => request<{ items: ClothingItem[] }>("/items"),

  createItem: (item: Omit<ClothingItem, "id" | "userId" | "createdAt" | "usageCount">) =>
    request<{ item: ClothingItem }>("/items", {
      method: "POST",
      body: JSON.stringify(item),
    }),

  updateItem: (id: string, patch: Partial<ClothingItem>) =>
    request<{ item: ClothingItem }>(`/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  deleteItem: (id: string) =>
    request<void>(`/items/${id}`, { method: "DELETE" }),

  getOutfits: () => request<{ outfits: Outfit[] }>("/outfits"),

  generateOutfit: (mode: Outfit["occasion"], items?: ClothingItem[], profile?: UserProfile) =>
    request<{ name: string; items: Outfit["items"]; notes: string }>("/outfits/generate", {
      method: "POST",
      body: JSON.stringify({ mode, items, profile }),
    }),

  createOutfit: (outfit: Outfit) =>
    request<{ outfit: Outfit }>("/outfits", {
      method: "POST",
      body: JSON.stringify(outfit),
    }),

  updateOutfit: (id: string, patch: Partial<Outfit>) =>
    request<{ outfit: Outfit }>(`/outfits/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  deleteOutfit: (id: string) =>
    request<void>(`/outfits/${id}`, { method: "DELETE" }),

  getChat: () => request<{ messages: ChatMessage[] }>("/chat"),

  sendChat: (content: string, items?: ClothingItem[], outfits?: Outfit[], profile?: UserProfile) =>
    request<{ userMessage: ChatMessage; reply: ChatMessage }>("/chat", {
      method: "POST",
      body: JSON.stringify({ content, items, outfits, profile }),
    }),

  clearChat: () =>
    request<{ messages: ChatMessage[] }>("/chat", { method: "DELETE" }),

  analyzeDiscoveryItem: <T>(input: unknown) =>
    request<T>("/discover/analyze", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  packMyBag: (input: PackRequest) =>
    request<PackResponse>("/pack", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
