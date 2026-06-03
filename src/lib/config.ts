/** True when Firebase client config is present in .env.local */
export function isFirebaseConfigured(): boolean {
  return !!(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID
  );
}

export const DATA_MODE = isFirebaseConfigured() ? "firebase" : "api";
