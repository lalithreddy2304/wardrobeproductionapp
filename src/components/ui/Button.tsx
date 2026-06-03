import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "ghost";

const styles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-[color:var(--color-gold-bright)] to-[color:var(--color-gold)] text-[color:var(--color-bg)] hover:shadow-lg hover:shadow-[color:var(--color-gold-shadow)]/30",
  secondary:
    "border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:border-[color:var(--color-gold)]/40",
  ghost: "text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface)]",
};

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "h-10 px-5 rounded-full text-sm font-medium inline-flex items-center justify-center gap-2 transition-all disabled:opacity-40",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
