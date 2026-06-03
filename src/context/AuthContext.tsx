import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { doc, getDoc } from "firebase/firestore";
import { updateProfile as updateFirebaseProfile, type User as FirebaseUser } from "firebase/auth";
import type { User, UserProfile } from "../types";
import {
  onAuthChange,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
} from "../lib/auth";
import { api, getToken, isTokenExpired, setAuthSyncUser, setToken } from "../services/api";
import { auth, getFirebaseDb } from "../lib/firebase";
import { logFirebaseError } from "../lib/firebaseError";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  authError: string | null;
  needsOnboarding: boolean;
  updateProfile: (profile: UserProfile) => void;
  updateDisplayName: (displayName: string) => Promise<void>;
  clearAuthState: () => void;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_SYNC_ERROR = "Connection error — please refresh";
const AUTH_SYNC_RETRY_MS = 2000;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function mapFirebaseUser(user: FirebaseUser, displayNameOverride?: string): User {
  return {
    id: user.uid,
    email: user.email ?? "",
    displayName: displayNameOverride ?? user.displayName ?? user.email ?? "User",
    photoURL: user.photoURL ?? undefined,
    provider: user.providerData.some((provider) => provider.providerId === "google.com")
      ? "google"
      : "password",
    createdAt: user.metadata.creationTime
      ? new Date(user.metadata.creationTime).getTime()
      : undefined,
  };
}

async function syncUserTokenWithRetry(nextUser: User) {
  setAuthSyncUser(nextUser);
  const currentToken = getToken();
  if (currentToken && !isTokenExpired(currentToken)) return;

  try {
    const { token } = await api.syncUser(nextUser);
    setToken(token);
    return;
  } catch (error) {
    console.warn(
      "Firebase login succeeded, but server JWT sync failed. Retrying once:",
      error instanceof Error ? error.message : error
    );
  }

  await wait(AUTH_SYNC_RETRY_MS);
  const { token } = await api.syncUser(nextUser);
  setToken(token);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function handleAuthChange(firebaseUser: FirebaseUser | null) {
      setLoading(true);
      setAuthError(null);

      if (!firebaseUser) {
        if (!cancelled) {
          setUser(null);
          setAuthSyncUser(null);
          setToken(null);
          setLoading(false);
        }
        return;
      }

      try {
        await firebaseUser.reload();
      } catch (error) {
        logFirebaseError("Firebase cached user reload failed", error);
        await signOut().catch((signOutError) => {
          logFirebaseError("Firebase sign-out after stale user reload failed", signOutError);
        });
        if (!cancelled) {
          setUser(null);
          setAuthSyncUser(null);
          setToken(null);
          setLoading(false);
        }
        return;
      }

      const nextUser = mapFirebaseUser(firebaseUser);
      try {
        await syncUserTokenWithRetry(nextUser);
      } catch (error) {
        logFirebaseError("Firebase login succeeded, but server JWT sync failed", error);
        if (!cancelled) {
          setUser(null);
          setToken(null);
          setAuthError(AUTH_SYNC_ERROR);
          setLoading(false);
        }
        return;
      }

      try {
        const snap = await getDoc(doc(getFirebaseDb(), "users", nextUser.id));
        const profile = snap.exists() ? (snap.data() as UserProfile) : undefined;
        if (!cancelled) setUser({ ...nextUser, profile });
      } catch (error) {
        console.warn(
          "Could not load user profile:",
          error instanceof Error ? error.message : error
        );
        if (!cancelled) setUser(nextUser);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const unsubscribe = onAuthChange((firebaseUser) => {
      void handleAuthChange(firebaseUser);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const needsOnboarding = !!user && user.profile?.onboardingComplete !== true;

  const clearAuthState = () => {
    setUser(null);
    setAuthError(null);
    setAuthSyncUser(null);
    setToken(null);
  };

  const syncUserToken = async (nextUser: User) => {
    await syncUserTokenWithRetry(nextUser);
  };

  const value: AuthContextValue = useMemo(() => ({
    user,
    loading,
    authError,
    needsOnboarding,
    updateProfile: (profile) => {
      setUser((current) => current ? { ...current, profile } : current);
    },
    updateDisplayName: async (displayName) => {
      const currentFirebaseUser = auth.currentUser;
      if (!currentFirebaseUser) throw new Error("You must be signed in to edit your name");
      await updateFirebaseProfile(currentFirebaseUser, { displayName });
      setUser((current) => current ? { ...current, displayName } : current);
    },
    clearAuthState,
    signUp: async (email, password, displayName) => {
      try {
        const credential = await signUpWithEmail(email, password, displayName);
        await syncUserToken(mapFirebaseUser(credential.user, displayName));
      } catch (error) {
        throw error instanceof Error ? error : new Error("Could not create account");
      }
    },
    signInWithEmail: async (email, password) => {
      try {
        await signInWithEmail(email, password);
      } catch (error) {
        throw error instanceof Error ? error : new Error("Sign in failed");
      }
    },
    signInWithGoogle: async () => {
      try {
        const credential = await signInWithGoogle();
        await syncUserToken(mapFirebaseUser(credential.user));
      } catch (error) {
        throw error instanceof Error ? error : new Error("Google sign-in failed");
      }
    },
    signOut: async () => {
      try {
        await signOut();
      } finally {
        setToken(null);
      }
    },
  }), [user, loading, authError, needsOnboarding]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}

export const useAuth = useAuthContext;
