import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { firebaseErrorMessage } from "../lib/firebaseError";

export function Login() {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signInWithEmail(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(firebaseErrorMessage(err, "Sign in failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Step into your wardrobe."
      image="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=85"
    >
      <form onSubmit={submit} className="space-y-4">
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
          placeholder="Password"
          value={password}
          onChange={setPassword}
          required
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
          {submitting ? "Signing in…" : "Sign in"}
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
              navigate("/", { replace: true });
            } catch (err) {
              setError(firebaseErrorMessage(err, "Google sign-in failed"));
            } finally {
              setSubmitting(false);
            }
          }}
          className="w-full h-12 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] text-sm font-medium flex items-center justify-center gap-3 hover:border-[color:var(--color-gold)]/40 transition-colors"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="text-sm text-center text-[color:var(--color-ink-muted)] pt-2">
          New here?{" "}
          <Link to="/signup" className="text-[color:var(--color-gold-bright)] hover:underline">
            Create an account
          </Link>
        </p>
      </form>

      <DemoHint />
      <button
        onClick={() => navigate("/signup", { replace: false })}
        className="sr-only"
      />
    </AuthShell>
  );
}

function DemoHint() {
  return (
    <p className="mt-6 text-xs text-[color:var(--color-ink-dim)] text-center">
      Demo: <span className="text-[color:var(--color-ink-muted)]">Continue with Google</span>
    </p>
  );
}

export function AuthShell({
  title,
  subtitle,
  image,
  children,
}: {
  title: string;
  subtitle: string;
  image: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen overflow-x-hidden lg:grid-cols-2">
      {/* Left: image / brand */}
      <div className="hidden lg:relative lg:block">
        <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/40 to-black/80" />
        <div className="absolute inset-0 p-12 flex flex-col justify-between grain">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg gold-ring flex items-center justify-center">
              <span className="text-[color:var(--color-gold)] font-serif text-xl leading-none">M</span>
            </div>
            <div>
              <p className="font-serif text-lg text-white tracking-wide">My Wardrobe</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">AI Atelier</p>
            </div>
          </div>
          <div className="max-w-md">
            <p className="font-serif text-4xl text-white leading-tight">
              Style, simplified.
            </p>
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="relative flex min-w-0 items-center justify-start overflow-hidden p-4 sm:justify-center sm:p-6 md:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="min-w-0 w-full max-w-[338px] sm:max-w-md"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden md:mb-10">
            <div className="h-10 w-10 rounded-lg gold-ring flex items-center justify-center">
              <span className="text-[color:var(--color-gold)] font-serif text-xl leading-none">M</span>
            </div>
            <p className="font-serif text-lg text-[color:var(--color-ink)]">My Wardrobe</p>
          </div>
          <div className="mb-8">
            <h1 className="font-serif text-[32px] leading-tight text-[color:var(--color-ink)] md:text-[36px]">
              {title}
            </h1>
            <p className="text-[color:var(--color-ink-muted)] mt-2">{subtitle}</p>
          </div>
          {children}
        </motion.div>
      </div>
    </div>
  );
}

type AuthInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
};

export function AuthInput({ icon, onChange, className, ...props }: AuthInputProps) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--color-ink-dim)]">
        {icon}
      </div>
      <input
        {...props}
        onChange={(e) => onChange(e.target.value)}
        className={
          className ??
          "w-full h-12 pl-11 pr-4 rounded-full bg-[color:var(--color-surface)] border border-[color:var(--color-border)] text-[color:var(--color-ink)] text-sm placeholder:text-[color:var(--color-ink-dim)] focus:outline-none focus:border-[color:var(--color-gold)]/50 transition-colors"
        }
      />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.4 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c10.5 0 19.2-8.1 19.9-18.5.1-.5.1-1 .1-1.5 0-1.1-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.4 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.4 0 10.2-2.1 13.9-5.4l-6.4-5.4C29.4 34.9 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.6 39.7 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.4 5.4c-.5.4 7.4-5.4 7.4-15.3 0-1.1-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
