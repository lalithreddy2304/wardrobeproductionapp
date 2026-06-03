import { Heart, Star, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import type { ClothingItem, Outfit } from "../types";
import { titleCase } from "../lib/utils";

type Props = {
  outfit: Outfit;
  itemsById: Record<string, ClothingItem>;
  onToggleFavorite?: (id: string) => void;
  onRemove?: (id: string) => void;
  onRate?: (id: string, rating: number) => void;
};

export function OutfitCard({ outfit, itemsById, onToggleFavorite, onRemove, onRate }: Props) {
  const resolved = outfit.items
    .map((r) => ({ role: r.role, item: itemsById[r.itemId] }))
    .filter((r) => r.item) as { role: string; item: ClothingItem }[];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="group relative rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] overflow-hidden lift"
    >
      {/* Image grid */}
      <div className="grid grid-cols-2 gap-px bg-[color:var(--color-border-soft)]">
        {resolved.slice(0, 4).map((r, i) => (
          <div key={r.item.id + i} className="relative aspect-square bg-[color:var(--color-bg)] overflow-hidden">
            <img
              src={r.item.imageUrl}
              alt={r.item.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <span className="absolute top-2 left-2 text-[9px] uppercase tracking-[0.2em] text-white/90 bg-black/40 backdrop-blur-md rounded-full px-2 py-0.5 border border-white/10">
              {r.role}
            </span>
          </div>
        ))}
        {/* Fill empty slots */}
        {Array.from({ length: Math.max(0, 4 - resolved.length) }).map((_, i) => (
          <div key={"empty" + i} className="aspect-square bg-[color:var(--color-bg)]" />
        ))}
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-gold)]">
              {titleCase(outfit.occasion)}
            </p>
            <h3 className="font-serif text-xl text-[color:var(--color-ink)] mt-1 truncate">
              {outfit.name}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onToggleFavorite?.(outfit.id)}
              className="h-8 w-8 rounded-full hover:bg-[color:var(--color-surface-2)] flex items-center justify-center"
              aria-label="Favorite"
            >
              <Heart
                className={`h-4 w-4 transition-colors ${
                  outfit.isFavorite
                    ? "fill-[color:var(--color-gold)] text-[color:var(--color-gold)]"
                    : "text-[color:var(--color-ink-muted)]"
                }`}
              />
            </button>
            {onRemove && (
              <button
                onClick={() => onRemove(outfit.id)}
                className="h-8 w-8 rounded-full hover:bg-red-500/10 flex items-center justify-center text-[color:var(--color-ink-muted)] hover:text-red-400"
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Rating */}
        {onRate && (
          <div className="flex items-center gap-1 mt-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => onRate(outfit.id, n)}
                aria-label={`Rate ${n}`}
                className="p-0.5"
              >
                <Star
                  className={`h-4 w-4 ${
                    n <= outfit.rating
                      ? "fill-[color:var(--color-gold)] text-[color:var(--color-gold)]"
                      : "text-[color:var(--color-border)]"
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 text-[11px] text-[color:var(--color-ink-dim)]">
              {outfit.rating > 0 ? `${outfit.rating}/5` : "Unrated"}
            </span>
          </div>
        )}

        {outfit.notes && (
          <p className="text-xs text-[color:var(--color-ink-muted)] mt-3 line-clamp-2 leading-relaxed">
            {outfit.notes}
          </p>
        )}
      </div>
    </motion.div>
  );
}
