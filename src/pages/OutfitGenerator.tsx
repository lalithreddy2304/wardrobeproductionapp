import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Heart, RefreshCw, Save, Wand2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useWardrobe } from "../context/WardrobeContext";
import { api, ApiError } from "../services/api";
import { createOutfitRecord, type OutfitMode } from "../lib/outfit";
import type { ClothingItem, OutfitItemRef } from "../types";
import { titleCase } from "../lib/utils";

const MODES: { key: OutfitMode; label: string; desc: string }[] = [
  { key: "random", label: "Serendipity", desc: "A considered surprise" },
  { key: "casual", label: "Casual", desc: "Effortless, everyday" },
  { key: "formal", label: "Formal", desc: "Structured & refined" },
  { key: "party", label: "Party", desc: "Statement-making" },
  { key: "wedding", label: "Wedding", desc: "Quiet elegance" },
];

export function OutfitGenerator() {
  const { user } = useAuth();
  const { items, addOutfit } = useWardrobe();
  const navigate = useNavigate();
  const [mode, setMode] = useState<OutfitMode>("random");
  const [current, setCurrent] = useState<{
    name: string;
    items: OutfitItemRef[];
    notes: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState("");
  const needsMoreItems = items.length < 3;

  const generate = async () => {
    if (needsMoreItems) {
      setCurrent(null);
      setError("");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await api.generateOutfit(mode, items, user?.profile);
      setCurrent(r);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return;
      setError(e instanceof ApiError ? e.message : "Could not generate outfit");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!current || !user) return;
    const o = createOutfitRecord(user.id, current.name, current.items, mode, current.notes);
    await addOutfit(o);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  const resolved: ClothingItem[] = current
    ? (current.items.map((r) => items.find((i) => i.id === r.itemId)).filter(Boolean) as ClothingItem[])
    : [];

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="grid gap-5 lg:grid-cols-[1fr_380px] lg:gap-6">
        <div className="relative min-h-[520px] overflow-hidden rounded-2xl gold-ring md:min-h-[600px] md:rounded-3xl">
          <div className="absolute inset-0 aurora-bg opacity-60" />
          <div className="relative flex h-full flex-col p-5 md:p-10">
            <div className="flex items-center gap-2 mb-6">
              <Wand2 className="h-4 w-4 text-[color:var(--color-gold)]" />
              <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-gold)]">Outfit studio</p>
            </div>

            {current ? (
              <motion.div
                key={current.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="grid flex-1 gap-6 md:grid-cols-2 md:gap-8"
              >
                <div className="grid grid-cols-2 gap-3">
                  {resolved.map((item, i) => (
                    <motion.div
                      key={item.id + i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.08, duration: 0.5 }}
                      className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-surface)]"
                    >
                      <img src={item.imageUrl} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-[9px] uppercase tracking-[0.22em] text-[color:var(--color-gold)]">
                          {titleCase(current.items[i]?.role ?? "")}
                        </p>
                        <p className="text-white font-serif text-base truncate">{item.name}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="flex flex-col justify-between">
                  <div>
                    <h2 className="font-serif text-3xl leading-tight text-[color:var(--color-ink)] md:text-[42px]">{current.name}</h2>
                    <p className="text-[color:var(--color-ink-muted)] mt-3 leading-relaxed text-sm">{current.notes}</p>
                  </div>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <button
                      onClick={generate}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-5 text-sm text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-gold)]/40 sm:w-auto"
                    >
                      <RefreshCw className="h-4 w-4" /> Shuffle
                    </button>
                    <button
                      onClick={save}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[color:var(--color-gold-bright)] to-[color:var(--color-gold)] px-5 text-sm font-medium text-[color:var(--color-bg)] transition-shadow hover:shadow-lg hover:shadow-[color:var(--color-gold-shadow)]/40 sm:w-auto"
                    >
                      <Save className="h-4 w-4" /> Save look
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 rounded-2xl gold-ring flex items-center justify-center mb-5">
                  <Sparkles className="h-6 w-6 text-[color:var(--color-gold)]" />
                </div>
                {needsMoreItems ? (
                  <>
                    <h3 className="max-w-md font-serif text-2xl text-[color:var(--color-ink)] md:text-3xl">
                      Your wardrobe needs at least 3 pieces to generate an outfit.
                    </h3>
                    <p className="text-[color:var(--color-ink-muted)] mt-3 max-w-md text-sm leading-relaxed">
                      Add a top, bottom, and shoes to get started.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("/wardrobe")}
                      className="mt-6 h-11 w-full rounded-full bg-gradient-to-b from-[color:var(--color-gold-bright)] to-[color:var(--color-gold)] px-5 text-sm font-medium text-[color:var(--color-bg)] transition-shadow hover:shadow-lg hover:shadow-[color:var(--color-gold-shadow)]/40 sm:w-auto"
                    >
                      Go to wardrobe
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="max-w-sm font-serif text-2xl text-[color:var(--color-ink)] md:text-3xl">
                      Compose a look that feels like <span className="text-gold-shimmer">you.</span>
                    </h3>
                    <p className="text-[color:var(--color-ink-muted)] mt-3 max-w-md text-sm leading-relaxed">
                      Choose an occasion, press generate, and watch a curated outfit come together from your own pieces.
                    </p>
                  </>
                )}
                {error && <p className="mt-5 text-xs text-red-400">{error}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-4 md:p-6">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-dim)]">Occasion</p>
            <h3 className="font-serif text-xl text-[color:var(--color-ink)] mt-1 mb-4">Set the scene</h3>
            <div className="space-y-2">
              {MODES.map((m) => {
                const active = mode === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => setMode(m.key)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      active
                        ? "border-[color:var(--color-gold)]/60 bg-[color:var(--color-gold)]/10"
                        : "border-[color:var(--color-border-soft)] hover:border-[color:var(--color-border)]"
                    }`}
                  >
                    <p className={`text-sm font-medium ${active ? "text-[color:var(--color-gold-bright)]" : "text-[color:var(--color-ink)]"}`}>
                      {m.label}
                    </p>
                    <p className="text-xs text-[color:var(--color-ink-muted)] mt-0.5">{m.desc}</p>
                  </button>
                );
              })}
            </div>
            <button
              onClick={generate}
              disabled={busy || needsMoreItems}
              className="mt-5 w-full h-12 rounded-full bg-gradient-to-b from-[color:var(--color-gold-bright)] to-[color:var(--color-gold)] text-[color:var(--color-bg)] font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-lg hover:shadow-[color:var(--color-gold-shadow)]/40 transition-shadow"
            >
              {busy ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Composing…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Generate outfit
                </>
              )}
            </button>
          </div>

          <div className="p-5 rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)]/60">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-[color:var(--color-gold)]" />
              <p className="text-xs text-[color:var(--color-ink-muted)]">
                We weight favorites and moderately-worn pieces to keep outfits feeling fresh, not repetitive.
              </p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {savedFlash && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[color:var(--color-gold)] px-5 py-3 text-sm font-medium text-[color:var(--color-bg)] shadow-2xl shadow-[color:var(--color-gold-shadow)]/50 md:bottom-8"
          >
            <Save className="h-4 w-4" /> Saved to your looks
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
