import { Link } from "react-router-dom";
import { Button } from "./Button";

export function EmptyState({
  title,
  actionLabel,
  actionTo,
}: {
  title: string;
  actionLabel?: string;
  actionTo?: string;
}) {
  return (
    <div className="py-16 text-center">
      <p className="font-serif text-xl text-[color:var(--color-ink)]">{title}</p>
      {actionLabel && actionTo && (
        <Link to={actionTo} className="inline-block mt-4">
          <Button>{actionLabel}</Button>
        </Link>
      )}
    </div>
  );
}
