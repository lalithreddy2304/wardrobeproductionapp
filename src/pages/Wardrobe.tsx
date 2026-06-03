import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useWardrobe } from "../context/WardrobeContext";
import { ClothingCard } from "../components/ClothingCard";
import { UploadModal } from "../components/UploadModal";
import type { Category, ClothingItem } from "../types";
import { titleCase } from "../lib/utils";

const CATEGORIES: (Category | "all")[] = ["all", "tops", "bottoms", "shoes", "accessories"];

type SortKey = "recent" | "name" | "most-worn";

export function Wardrobe() {
  const { items, addItem, removeItem, toggleFavoriteItem } = useWardrobe();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detail, setDetail] = useState<ClothingItem | null>(null);

  const filtered = useMemo(() => {
    let list = items.slice();
    if (category !== "all") list = list.filter((i) => i.category === category);
    if (favoritesOnly) list = list.filter((i) => i.isFavorite);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.color.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "most-worn") list.sort((a, b) => b.usageCount - a.usageCount);
    else list.sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }, [items, category, favoritesOnly, query, sort]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    items.forEach((i) => {
      c[i.category] = (c[i.category] ?? 0) + 1;
    });
    return c;
  }, [items]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 md:space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 flex items-center gap-2 h-11 px-4 rounded-full bg-[color:var(--color-surface)] border border-[color:var(--color-border-soft)] focus-within:border-[color:var(--color-gold)]/40 transition-colors">
          <Search className="h-4 w-4 text-[color:var(--color-ink-dim)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, color, or tag…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-[color:var(--color-ink-dim)] text-[color:var(--color-ink)]"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="grid gap-2 sm:flex sm:items-center">
          <div className="flex h-11 min-w-0 items-center gap-2 rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] px-1">
            <SlidersHorizontal className="h-4 w-4 ml-3 text-[color:var(--color-ink-dim)]" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="min-w-0 flex-1 cursor-pointer bg-transparent pr-3 text-sm text-[color:var(--color-ink)] outline-none"
            >
              <option value="recent">Recently added</option>
              <option value="name">By name</option>
              <option value="most-worn">Most worn</option>
            </select>
          </div>
          <button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={`h-11 w-full rounded-full border px-4 text-sm transition-colors sm:w-auto ${
              favoritesOnly
                ? "border-[color:var(--color-gold)]/50 bg-[color:var(--color-gold)]/10 text-[color:var(--color-gold-bright)]"
                : "border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
            }`}
          >
            ♥ Favorites
          </button>
          <button
            onClick={() => setUploadOpen(true)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[color:var(--color-gold-bright)] to-[color:var(--color-gold)] px-5 text-sm font-medium text-[color:var(--color-bg)] transition-shadow hover:shadow-lg hover:shadow-[color:var(--color-gold-shadow)]/40 sm:w-auto"
          >
            <Plus className="h-4 w-4" /> Add piece
          </button>
        </div>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const active = category === c;
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`h-9 px-4 rounded-full text-xs uppercase tracking-[0.18em] transition-all border ${
                active
                  ? "border-[color:var(--color-gold)]/60 bg-[color:var(--color-gold)]/10 text-[color:var(--color-gold-bright)]"
                  : "border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] hover:border-[color:var(--color-border)]"
              }`}
            >
              {c === "all" ? "All" : titleCase(c)}
              <span className="ml-2 text-[color:var(--color-ink-dim)]">{counts[c] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] px-4 py-14 text-center md:py-20">
          <p className="font-serif text-2xl text-[color:var(--color-ink)]">
            {query ? "No pieces match your search" : "Nothing here yet"}
          </p>
          <p className="text-sm text-[color:var(--color-ink-muted)] mt-2">
            {query
              ? "Try a different keyword, color, or tag."
              : "Add your first piece to begin curating your wardrobe."}
          </p>
          {!query && (
            <button
              onClick={() => setUploadOpen(true)}
              className="mt-5 h-10 w-full rounded-full bg-gradient-to-b from-[color:var(--color-gold-bright)] to-[color:var(--color-gold)] px-5 text-sm font-medium text-[color:var(--color-bg)] sm:w-auto"
            >
              Upload a piece
            </button>
          )}
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((i) => (
              <ClothingCard
                key={i.id}
                item={i}
                onToggleFavorite={toggleFavoriteItem}
                onRemove={removeItem}
                onClick={(item) => setDetail(item)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onSubmit={addItem} />

      {/* Detail drawer */}
      <AnimatePresence>
        {detail && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
              onClick={() => setDetail(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 260 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[440px] bg-[color:var(--color-bg-elev)] border-l border-[color:var(--color-border)] z-50 overflow-y-auto"
            >
              <div className="relative aspect-[4/5] bg-[color:var(--color-surface)]">
                <img src={detail.imageUrl} alt={detail.name} className="absolute inset-0 w-full h-full object-cover" />
                <button
                  onClick={() => setDetail(null)}
                  className="absolute top-4 right-4 h-9 w-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
              <div className="space-y-4 p-5 md:p-6">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-gold)]">
                    {titleCase(detail.category)}
                  </p>
                  <h3 className="mt-1 font-serif text-2xl text-[color:var(--color-ink)] md:text-3xl">
                    {detail.name}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Chip label="Color" value={detail.color} />
                  <Chip label="Wears" value={String(detail.usageCount)} />
                  {detail.tags.map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2.5 py-1 rounded-full bg-[color:var(--color-surface)] border border-[color:var(--color-border)] text-[color:var(--color-ink-muted)]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
                <div className="grid gap-2 pt-2 sm:grid-cols-2">
                  <button
                    onClick={() => {
                      toggleFavoriteItem(detail.id);
                      setDetail({ ...detail, isFavorite: !detail.isFavorite });
                    }}
                    className="flex-1 h-11 rounded-full border border-[color:var(--color-border)] text-sm text-[color:var(--color-ink)] hover:border-[color:var(--color-gold)]/40 transition-colors"
                  >
                    {detail.isFavorite ? "♥ Favorited" : "♡ Favorite"}
                  </button>
                  <button
                    onClick={() => {
                      removeItem(detail.id);
                      setDetail(null);
                    }}
                    className="flex-1 h-11 rounded-full border border-red-500/20 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-1.5 rounded-full bg-[color:var(--color-surface)] border border-[color:var(--color-border)] text-xs">
      <span className="text-[color:var(--color-ink-dim)] uppercase tracking-widest text-[10px] mr-2">
        {label}
      </span>
      <span className="text-[color:var(--color-ink)]">{value}</span>
    </div>
  );
}
