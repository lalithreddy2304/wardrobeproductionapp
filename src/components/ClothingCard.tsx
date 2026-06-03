import { Heart, MoreHorizontal, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import type { ClothingItem } from "../types";
import { titleCase } from "../lib/utils";

type Props = {
  item: ClothingItem;
  onToggleFavorite?: (id: string) => void;
  onRemove?: (id: string) => void;
  onClick?: (item: ClothingItem) => void;
};

export function ClothingCard({ item, onToggleFavorite, onRemove, onClick }: Props) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="group relative lift"
    >
      <div
        onClick={() => onClick?.(item)}
        className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[color:var(--color-surface)] border border-[color:var(--color-border-soft)] cursor-pointer"
      >
        <img
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-70 group-hover:opacity-90 transition-opacity" />

        {/* Top actions */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-ink)]/90 bg-black/40 backdrop-blur-md rounded-full px-2.5 py-1 border border-white/10">
            {titleCase(item.category)}
          </span>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite?.(item.id);
              }}
              className="h-8 w-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center hover:bg-black/70 border border-white/10"
              aria-label="Favorite"
            >
              <Heart
                className={`h-4 w-4 ${
                  item.isFavorite
                    ? "fill-[color:var(--color-gold)] text-[color:var(--color-gold)]"
                    : "text-white"
                }`}
              />
            </button>
            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.id);
                }}
                className="h-8 w-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center hover:bg-red-500/80 border border-white/10"
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Always-on favorite indicator */}
        {item.isFavorite && (
          <div className="absolute top-3 right-3 group-hover:opacity-0 transition-opacity">
            <Heart className="h-4 w-4 fill-[color:var(--color-gold)] text-[color:var(--color-gold)] drop-shadow" />
          </div>
        )}

        {/* Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-serif text-lg text-white leading-tight drop-shadow">
            {item.name}
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-white/80">
              <span
                className="h-2.5 w-2.5 rounded-full border border-white/30"
                style={{ background: cssColor(item.color) }}
              />
              {item.color}
            </span>
            <span className="text-[11px] text-white/50">· {item.usageCount} wears</span>
          </div>
        </div>
      </div>

      {/* Subtle menu */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(item);
        }}
        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 rounded-full bg-[color:var(--color-surface)] border border-[color:var(--color-border)] flex items-center justify-center"
        aria-label="More"
      >
        <MoreHorizontal className="h-4 w-4 text-[color:var(--color-ink-muted)]" />
      </button>
    </motion.div>
  );
}

/**
 * Maps common color names to approximate CSS hex values for swatches.
 */
function cssColor(name: string): string {
  const n = name.toLowerCase();
  const map: Record<string, string> = {
    black: "#0e0e10",
    white: "#f7f5f0",
    ivory: "#efe8d6",
    cream: "#e9dfc8",
    camel: "#b48a5a",
    tan: "#c49a6c",
    beige: "#d2c0a1",
    navy: "#1f2a44",
    indigo: "#3a4a75",
    charcoal: "#3a3a3e",
    chocolate: "#5b3a22",
    gold: "#d4b483",
    nude: "#d8b79a",
    multicolor: "linear-gradient(135deg, #d4b483, #1f2a44, #b48a5a)",
  };
  for (const key in map) {
    if (n.includes(key)) return map[key];
  }
  return "#8a8477";
}
