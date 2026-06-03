import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import type { UserProfile } from "../types";

export function useUserProfile() {
  const { user, updateProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(user?.profile ?? null);
  const [loading, setLoading] = useState(!!user && !user.profile);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      if (user.profile) {
        setProfile(user.profile);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const snap = await getDoc(doc(getFirebaseDb(), "users", user.id));
        const data = snap.exists() ? (snap.data() as UserProfile) : null;
        if (!cancelled) setProfile(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function saveProfile(nextProfile: UserProfile) {
    if (!user) throw new Error("You must be signed in to save your profile");
    await setDoc(doc(getFirebaseDb(), "users", user.id), nextProfile, { merge: true });
    setProfile(nextProfile);
    updateProfile(nextProfile);
  }

  return { profile, loading, saveProfile };
}
