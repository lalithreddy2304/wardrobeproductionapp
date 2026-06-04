import { cn } from "../../lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)]",
        className
      )}
    >
      {children}
    </div>
  );
}
