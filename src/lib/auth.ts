import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type NextOrObserver,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";
import { logFirebaseError } from "./firebaseError";

export async function signUpWithEmail(email: string, password: string, displayName?: string) {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(credential.user, { displayName });
    }
    return credential;
  } catch (error) {
    logFirebaseError("Firebase email sign-up failed", error);
    throw error instanceof Error ? error : new Error("Could not create account");
  }
}

export async function signInWithEmail(email: string, password: string) {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    logFirebaseError("Firebase email sign-in failed", error);
    throw error instanceof Error ? error : new Error("Sign in failed");
  }
}

export async function signInWithGoogle() {
  try {
    return await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (error) {
    logFirebaseError("Firebase Google sign-in failed", error);
    throw error instanceof Error ? error : new Error("Google sign-in failed");
  }
}

export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    logFirebaseError("Firebase sign-out failed", error);
    throw error instanceof Error ? error : new Error("Sign out failed");
  }
}

export function onAuthChange(callback: NextOrObserver<User>) {
  try {
    return onAuthStateChanged(auth, callback);
  } catch (error) {
    throw error instanceof Error ? error : new Error("Could not listen to auth changes");
  }
}
