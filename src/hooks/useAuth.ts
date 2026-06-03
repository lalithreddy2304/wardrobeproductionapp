import { useEffect, useState } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { onAuthChange } from "../lib/auth";
import type { User } from "../types";

function mapFirebaseUser(user: FirebaseUser): User {
  return {
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
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser ? mapFirebaseUser(firebaseUser) : null);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, loading };
}
