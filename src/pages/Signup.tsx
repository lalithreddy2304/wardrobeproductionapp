import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AuthShell, AuthInput } from "./Login";
import { firebaseErrorMessage } from "../lib/firebaseError";

export function Signup() {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signUp(email, password, displayName);
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setError(firebaseErrorMessage(err, "Could not create account"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Begin your wardrobe"
      subtitle="Create a private, considered space for your style."
      image="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=85"
    >
      <form onSubmit={submit} className="space-y-4">
        <AuthInput
          icon={<User className="h-4 w-4" />}
          placeholder="Your name"
          value={displayName}
          onChange={setDisplayName}
          required
        />
        <AuthInput
          icon={<Mail className="h-4 w-4" />}
          type="email"
          placeholder="you@domain.com"
          value={email}
          onChange={setEmail}
          required
        />
        <AuthInput
          icon={<Lock className="h-4 w-4" />}
          type="password"
          placeholder="Password (min. 6 characters)"
          value={password}
          onChange={setPassword}
          required
          minLength={6}
        />

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-12 rounded-full bg-gradient-to-b from-[color:var(--color-gold-bright)] to-[color:var(--color-gold)] text-[color:var(--color-bg)] font-medium text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[color:var(--color-gold-shadow)]/40 transition-shadow disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Create account"}
          {!submitting && <ArrowRight className="h-4 w-4" />}
        </button>

        <div className="relative py-2">
          <div className="absolute inset-x-0 top-1/2 h-px bg-[color:var(--color-border)]" />
          <span className="relative block text-center text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-ink-dim)] bg-[color:var(--color-bg-elev)] mx-auto w-fit px-3">
            or
          </span>
        </div>

        <button
          type="button"
          onClick={async () => {
            setError("");
            setSubmitting(true);
            try {
              await signInWithGoogle();
              navigate("/onboarding", { replace: true });
            } catch (err) {
              setError(firebaseErrorMessage(err, "Google sign-in failed"));
            } finally {
              setSubmitting(false);
            }
          }}
          className="w-full h-12 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] text-sm font-medium flex items-center justify-center gap-3 hover:border-[color:var(--color-gold)]/40 transition-colors"
        >
          Continue with Google
        </button>

        <p className="text-sm text-center text-[color:var(--color-ink-muted)] pt-2">
          Already have an account?{" "}
          <Link to="/login" className="text-[color:var(--color-gold-bright)] hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
