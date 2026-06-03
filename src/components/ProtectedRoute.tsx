import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, authError, needsOnboarding } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 rounded-full border border-[color:var(--color-border)]" />
            <div
              className="absolute inset-0 rounded-full border-t-[color:var(--color-gold)] animate-spin"
              style={{ borderWidth: 1 }}
            />
          </div>
          <p className="text-[color:var(--color-ink-muted)] text-sm tracking-widest uppercase">
            Opening your wardrobe
          </p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-sm rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-center">
          <p className="text-sm text-red-200">{authError}</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (location.pathname === "/onboarding" && !needsOnboarding) {
    return <Navigate to="/" replace />;
  }
  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}
