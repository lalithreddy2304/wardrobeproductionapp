import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Star } from "lucide-react";
import { useWardrobe } from "../context/WardrobeContext";
import { OutfitCard } from "../components/OutfitCard";
import { titleCase } from "../lib/utils";

type FilterKey = "all" | "favorites" | "top-rated";

export function SavedOutfits() {
  const { outfits, items, toggleFavoriteOutfit, removeOutfit, updateOutfit } = useWardrobe();
  const [filter, setFilter] = useState<FilterKey>("all");

  const itemsById = useMemo(() => {
    const map: Record<string, (typeof items)[number]> = {};
    items.forEach((i) => (map[i.id] = i));
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    let list = outfits.slice();
    if (filter === "favorites") list = list.filter((o) => o.isFavorite);
    else if (filter === "top-rated") list = list.filter((o) => o.rating >= 4).sort((a, b) => b.rating - a.rating);
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }, [outfits, filter]);

  const byOccasion = useMemo(() => {
    const map: Record<string, number> = {};
    outfits.forEach((o) => {
      map[o.occasion] = (map[o.occasion] ?? 0) + 1;
    });
    return map;
  }, [outfits]);

  const rate = (id: string, rating: number) => {
    updateOutfit(id, { rating });
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 md:space-y-6">
      {/* Header metrics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Metric label="Total looks" value={outfits.length} />
        <Metric label="Favorites" value={outfits.filter((o) => o.isFavorite).length} />
        <Metric
          label="Top rated"
          value={outfits.filter((o) => o.rating >= 4).length}
        />
        {["casual", "formal"].map((o) => (
          <Metric key={o} label={titleCase(o)} value={byOccasion[o] ?? 0} />
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["all", "favorites", "top-rated"] as FilterKey[]).map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`h-9 px-4 rounded-full text-xs uppercase tracking-[0.18em] transition-all border flex items-center gap-2 ${
                active
                  ? "border-[color:var(--color-gold)]/60 bg-[color:var(--color-gold)]/10 text-[color:var(--color-gold-bright)]"
                  : "border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
              }`}
            >
              {f === "favorites" && <Heart className="h-3 w-3" />}
              {f === "top-rated" && <Star className="h-3 w-3" />}
              {f === "all" ? "All" : titleCase(f.replace("-", " "))}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] px-4 py-14 text-center md:py-20">
          <Heart className="h-5 w-5 text-[color:var(--color-gold)] mx-auto mb-3" />
          <p className="font-serif text-2xl text-[color:var(--color-ink)]">No looks here yet</p>
          <p className="text-sm text-[color:var(--color-ink-muted)] mt-2">
            {filter === "all"
              ? "Generate and save your first outfit in the Studio."
              : filter === "favorites"
              ? "Heart an outfit to save it here."
              : "Rate an outfit 4+ stars to see it here."}
          </p>
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((o) => (
              <OutfitCard
                key={o.id}
                outfit={o}
                itemsById={itemsById}
                onToggleFavorite={toggleFavoriteOutfit}
                onRemove={removeOutfit}
                onRate={rate}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-3 md:p-4">
      <p className="font-serif text-xl text-[color:var(--color-ink)] md:text-2xl">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-[color:var(--color-ink-muted)] mt-0.5">
        {label}
      </p>
    </div>
  );
}
