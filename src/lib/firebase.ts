import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const requiredFirebaseConfig = {
  VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  VITE_FIREBASE_APP_ID: firebaseConfig.appId,
};

const missingFirebaseConfig = Object.entries(requiredFirebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFirebaseConfig.length > 0) {
  console.error("Firebase configuration is incomplete", {
    code: "firebase/missing-config",
    message: `Missing required Firebase config: ${missingFirebaseConfig.join(", ")}`,
    stack: undefined,
  });
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export function getFirebaseApp() {
  return app;
}

export function getFirebaseAuth() {
  return auth;
}

export function getFirebaseDb() {
  return db;
}

export function getFirebaseStorage() {
  return storage;
}
