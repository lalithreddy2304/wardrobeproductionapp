import { useState } from "react";
import type { Category } from "../../types";
import { cn } from "../../lib/utils";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  category?: Category;
  fallbackLabel?: string;
};

const categoryInitial: Record<Category, string> = {
  tops: "T",
  bottoms: "B",
  shoes: "S",
  accessories: "A",
};

export function FallbackImage({
  src,
  alt = "",
  category,
  fallbackLabel,
  className,
  ...props
}: Props) {
  const [failed, setFailed] = useState(!src);
  const label = fallbackLabel ?? alt;
  const initial = category ? categoryInitial[category] : label.charAt(0).toUpperCase() || "M";

  if (failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-[color:var(--color-surface)] text-sm font-medium text-[color:var(--color-gold)]",
          className
        )}
        aria-label={label}
        role="img"
      >
        <span className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-2 py-1">
          {initial}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      {...props}
    />
  );
}
