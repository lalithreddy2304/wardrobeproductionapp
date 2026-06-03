import { useMemo } from "react";
import { motion } from "framer-motion";
import { Flame, Leaf, Palette, Shirt } from "lucide-react";
import { useWardrobe } from "../context/WardrobeContext";
import { titleCase } from "../lib/utils";
import type { ClothingItem } from "../types";

const NEUTRALS = [
  "black",
  "white",
  "navy",
  "grey",
  "gray",
  "beige",
  "cream",
  "ivory",
  "tan",
  "camel",
  "brown",
  "charcoal",
];

export function Insights() {
  const { items } = useWardrobe();

  const categoryDist = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((i) => (counts[i.category] = (counts[i.category] ?? 0) + 1));
    return ["tops", "bottoms", "shoes", "accessories"].map((c) => ({
      name: c,
      count: counts[c] ?? 0,
      pct: items.length ? ((counts[c] ?? 0) / items.length) * 100 : 0,
    }));
  }, [items]);

  const colorDist = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((i) => (counts[i.color] = (counts[i.color] ?? 0) + 1));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([color, count]) => ({ color, count }));
  }, [items]);

  const totalWears = items.reduce((s, i) => s + i.usageCount, 0);
  const styledOutfits = useMemo(() => countStyledOutfits(items), [items]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Topline */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI icon={Shirt} label="Pieces" value={items.length} />
        <KPI icon={Flame} label="Total wears" value={totalWears} />
        <KPI icon={Leaf} label="Styled outfits" value={styledOutfits} />
        <KPI icon={Palette} label="Unique colors" value={colorDist.length} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Category distribution */}
        <Panel
          eyebrow="Composition"
          title="By category"
          subtitle="The proportions that define your silhouette"
        >
          <div className="space-y-4">
            {categoryDist.map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-[color:var(--color-ink)]">
                    {titleCase(c.name)}
                  </span>
                  <span className="text-xs text-[color:var(--color-ink-muted)]">
                    {c.count} · {c.pct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[color:var(--color-bg)] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${c.pct}%` }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full bg-gradient-to-r from-[color:var(--color-gold)] to-[color:var(--color-gold-deep)]"
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Color analytics */}
        <Panel
          eyebrow="Palette"
          title="By color"
          subtitle="The colors you gravitate toward"
        >
          <div className="space-y-3">
            {colorDist.map((c, i) => {
              const max = colorDist[0]?.count ?? 1;
              const pct = (c.count / max) * 100;
              return (
                <div key={c.color} className="flex items-center gap-3">
                  <span className="text-sm text-[color:var(--color-ink)] w-24">{c.color}</span>
                  <div className="flex-1 h-8 rounded-lg bg-[color:var(--color-bg)] overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.9, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full bg-gradient-to-r from-[color:var(--color-gold)]/90 to-[color:var(--color-gold-deep)]/80"
                    />
                  </div>
                  <span className="text-xs text-[color:var(--color-ink-muted)] w-8 text-right">
                    {c.count}
                  </span>
                </div>
              );
            })}
            {colorDist.length === 0 && (
              <p className="text-sm text-[color:var(--color-ink-muted)]">No data yet.</p>
            )}
          </div>
        </Panel>
      </div>

    </div>
  );
}

function countStyledOutfits(items: ClothingItem[]) {
  const tops = items.filter((item) => item.category === "tops");
  const bottoms = items.filter((item) => item.category === "bottoms");
  const shoes = items.filter((item) => item.category === "shoes");
  let smartCombinations = 0;

  tops.forEach((top) => {
    bottoms.forEach((bottom) => {
      if (!colorsWorkTogether(top.color, bottom.color)) return;
      if (shoes.length === 0) {
        smartCombinations++;
      } else {
        shoes.forEach((shoe) => {
          if (!colorsWorkTogether(top.color, shoe.color)) return;
          if (!colorsWorkTogether(bottom.color, shoe.color)) return;
          smartCombinations++;
        });
      }
    });
  });

  return smartCombinations;
}

function isNeutral(color: string): boolean {
  return NEUTRALS.some((neutral) => color.toLowerCase().includes(neutral));
}

function colorsWorkTogether(c1: string, c2: string): boolean {
  if (!isNeutral(c1) && !isNeutral(c2)) {
    const c1l = c1.toLowerCase();
    const c2l = c2.toLowerCase();
    if (c1l.includes(c2l) || c2l.includes(c1l)) return true;
    return false;
  }
  return true;
}

function KPI({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
}) {
  return (
    <div className="p-5 rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)]">
      <Icon className="h-4 w-4 text-[color:var(--color-gold)]" />
      <p className="font-serif text-3xl text-[color:var(--color-ink)] mt-3">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-[color:var(--color-ink-muted)] mt-1">
        {label}
      </p>
    </div>
  );
}

function Panel({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-6 rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)]">
      <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-dim)]">
        {eyebrow}
      </p>
      <h3 className="font-serif text-2xl text-[color:var(--color-ink)] mt-1">{title}</h3>
      <p className="text-sm text-[color:var(--color-ink-muted)] mt-1 mb-5">{subtitle}</p>
      {children}
    </div>
  );
}
