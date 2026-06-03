import { auth } from "../lib/firebase";
import type { User } from "../types";
import { api, setAuthSyncUser, setToken } from "./api";

export async function getFirebaseIdToken() {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No Firebase user is signed in");
    }

    return await user.getIdToken();
  } catch (error) {
    throw error instanceof Error ? error : new Error("Could not read Firebase ID token");
  }
}

export async function syncWithServer() {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No Firebase user is signed in");
    }

    const appUser: User = {
      id: user.uid,
      email: user.email ?? "",
      displayName: user.displayName ?? user.email ?? "User",
      photoURL: user.photoURL ?? undefined,
      provider: user.providerData.some((provider) => provider.providerId === "google.com")
        ? "google"
        : "password",
      createdAt: user.metadata.creationTime
        ? new Date(user.metadata.creationTime).getTime()
        : undefined,
    };
    setAuthSyncUser(appUser);
    const { token } = await api.syncUser(appUser);
    setToken(token);
    return token;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Could not sync Firebase session with server");
  }
}
