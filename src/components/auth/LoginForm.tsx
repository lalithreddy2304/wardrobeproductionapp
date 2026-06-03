import { useState, type FormEvent } from "react";
import { Mail, Lock } from "lucide-react";
import { signInWithEmail, signInWithGoogle } from "../../lib/auth";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleEmailSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await signInWithEmail(email, password);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await signInWithGoogle();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Google sign-in failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleEmailSignIn} className="space-y-4">
      <label className="block">
        <span className="sr-only">Email</span>
        <span className="relative block">
          <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-ink-dim)]" />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@domain.com"
            required
            className="h-12 w-full rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] pl-11 pr-4 text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-dim)] focus:border-[color:var(--color-gold)]/50 focus:outline-none"
          />
        </span>
      </label>

      <label className="block">
        <span className="sr-only">Password</span>
        <span className="relative block">
          <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-ink-dim)]" />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
            className="h-12 w-full rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] pl-11 pr-4 text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-dim)] focus:border-[color:var(--color-gold)]/50 focus:outline-none"
          />
        </span>
      </label>

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex h-12 w-full items-center justify-center rounded-full bg-[color:var(--color-gold)] text-sm font-medium text-[color:var(--color-bg)] transition-opacity disabled:opacity-60"
      >
        {submitting ? "Signing in..." : "Sign in"}
      </button>

      <button
        type="button"
        disabled={submitting}
        onClick={handleGoogleSignIn}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm font-medium text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-gold)]/40 disabled:opacity-60"
      >
        <GoogleIcon />
        Continue with Google
      </button>
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.4 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c10.5 0 19.2-8.1 19.9-18.5.1-.5.1-1 .1-1.5 0-1.1-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.4 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.4 0 10.2-2.1 13.9-5.4l-6.4-5.4C29.4 34.9 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.6 39.7 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.4 5.4c-.5.4 7.4-5.4 7.4-15.3 0-1.1-.1-2.3-.4-3.5z" />
    </svg>
  );
}
