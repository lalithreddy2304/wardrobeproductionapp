import { scoreColorCompatibility, scoreOutfitPalette, isNeutral } from "./ittenColorTheory.js";
import { scoreFrenchMethod, assignColorRoles } from "./frenchCapsuleMethod.js";
import type { ClothingItem, OutfitItemRef } from "../types.js";

export type OutfitMode = "random" | "casual" | "formal" | "party" | "wedding";

const OCCASION_RULES: Record<OutfitMode, { tags?: string[]; avoidTags?: string[] }> = {
  random: {},
  casual: { tags: ["casual", "cotton", "linen", "denim", "minimal"], avoidTags: ["wedding"] },
  formal: { tags: ["formal", "silk", "wool", "blazer", "leather"] },
  party: { tags: ["silk", "trendy", "accent"], avoidTags: ["wedding", "cozy"] },
  wedding: { tags: ["wedding", "formal", "feminine", "silk"] },
};

const recentlyUsedItems = new Map<string, string[]>();

function score(item: ClothingItem, mode: OutfitMode): number {
  const rules = OCCASION_RULES[mode];
  let s = 1;
  if (rules.avoidTags?.some((t) => item.tags.includes(t))) s -= 10;
  if (rules.tags?.some((t) => item.tags.includes(t))) s += 2;
  if (item.isFavorite) s += 0.5;
  if (item.usageCount > 5 && item.usageCount < 25) s += 0.3;
  return Math.max(0.1, s);
}

function recentItemPenalty(userId: string, item: ClothingItem): number {
  const recent = recentlyUsedItems.get(userId) ?? [];
  return recent.filter((itemId) => itemId === item.id).length * 3;
}

function rememberRecentlyUsedItems(userId: string, itemIds: string[]) {
  const recent = recentlyUsedItems.get(userId) ?? [];
  recentlyUsedItems.set(userId, [...recent, ...itemIds].slice(-6));
}

function weightedPick(pool: ClothingItem[], mode: OutfitMode): ClothingItem | undefined {
  if (pool.length === 0) return undefined;
  const weights = pool.map((i) => score(i, mode));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[0];
}

const PALETTES: string[][] = [
  ["Black", "White", "Cream", "Ivory"],
  ["Black", "Camel", "Gold", "Tan"],
  ["Navy", "Ivory", "Cream", "Beige"],
  ["Charcoal", "Cream", "Black", "Tan"],
  ["Chocolate", "Cream", "Ivory", "Gold"],
  ["Indigo", "White", "Cream", "Tan"],
];

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  const k = Math.min(n, copy.length);
  for (let i = 0; i < k; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function inPalette(item: ClothingItem, palette: string[]): boolean {
  return palette.some((c) => item.color.toLowerCase().includes(c.toLowerCase()));
}

function getItemFormality(item: ClothingItem): number {
  const tags = item.tags.map((tag) => tag.toLowerCase());
  if (tags.some((tag) => ["casual", "cotton", "denim", "relaxed"].includes(tag))) return 1;
  if (tags.some((tag) => ["minimal", "linen", "everyday"].includes(tag))) return 2;
  if (tags.some((tag) => ["smart-casual", "chino"].includes(tag))) return 3;
  if (tags.some((tag) => ["formal", "silk", "wool", "blazer", "tailored"].includes(tag))) return 4;
  if (tags.some((tag) => ["wedding", "gown", "evening"].includes(tag))) return 5;
  return 2;
}

function formalityCompatible(item: ClothingItem, mode: OutfitMode): boolean {
  const formality = getItemFormality(item);
  const ranges: Record<OutfitMode, [number, number]> = {
    casual: [1, 2],
    random: [1, 4],
    formal: [3, 5],
    party: [3, 4],
    wedding: [4, 5],
  };
  const [min, max] = ranges[mode];
  return formality >= min && formality <= max;
}

function occasionDescription(mode: OutfitMode): string {
  return mode === "formal"
    ? "A tailored silhouette with structured lines. Keep accessories minimal and polished."
    : mode === "casual"
    ? "Relaxed, everyday elegance. Layer lightly and prioritize comfort without sacrificing style."
    : mode === "party"
    ? "Elevated textures and a confident palette. Let one statement piece carry the look."
    : mode === "wedding"
    ? "Soft, considered, and elegant. Stick to muted tones and refined tailoring."
    : "A balanced composition — let the palette and proportions do the talking.";
}

function fallbackGenerateOutfit(
  items: ClothingItem[],
  mode: OutfitMode
): {
  name: string;
  items: OutfitItemRef[];
  notes: string;
  score: number;
  colorScore: number;
  frenchScore: number;
  violations: string[];
  colorReason: string;
} {
  const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  const byCategory = {
    tops: items.filter((i) => i.category === "tops"),
    bottoms: items.filter((i) => i.category === "bottoms"),
    shoes: items.filter((i) => i.category === "shoes"),
    accessories: items.filter((i) => i.category === "accessories"),
  };
  const filtered = {
    tops: byCategory.tops.filter((i) => inPalette(i, palette)),
    bottoms: byCategory.bottoms.filter((i) => inPalette(i, palette)),
    shoes: byCategory.shoes.filter((i) => inPalette(i, palette)),
    accessories: byCategory.accessories.filter((i) => inPalette(i, palette)),
  };
  const top = weightedPick(filtered.tops.length ? filtered.tops : byCategory.tops, mode);
  const bottom = weightedPick(filtered.bottoms.length ? filtered.bottoms : byCategory.bottoms, mode);
  const shoes = weightedPick(filtered.shoes.length ? filtered.shoes : byCategory.shoes, mode);
  const accessories = pickRandom(
    filtered.accessories.length ? filtered.accessories : byCategory.accessories,
    mode === "random" ? 1 : 2
  );
  const refs: OutfitItemRef[] = [];
  if (top) refs.push({ itemId: top.id, role: "top" });
  if (bottom) refs.push({ itemId: bottom.id, role: "bottom" });
  if (shoes) refs.push({ itemId: shoes.id, role: "shoes" });
  accessories.forEach((a) => refs.push({ itemId: a.id, role: "accessory" }));
  const mood =
    mode === "casual" ? "Effortless" : mode === "formal" ? "Refined" : mode === "party" ? "Statement" : mode === "wedding" ? "Graceful" : "Curated";
  const name = `${mood} ${top?.color ?? ""}${top?.color && bottom?.color ? " & " : ""}${bottom?.color ?? ""} Look`.trim();
  const paletteStr = palette.slice(0, 3).join(", ");
  const base = occasionDescription(mode);
  const selectedColors = [top?.color, bottom?.color, shoes?.color, ...accessories.map((item) => item.color)]
    .filter((color): color is string => Boolean(color));
  const paletteScore = selectedColors.length > 1 ? scoreOutfitPalette(selectedColors) : undefined;
  const notes = `${base} Palette: ${paletteStr}. ${top ? `Top: ${top.name}.` : ""} ${bottom ? `Bottom: ${bottom.name}.` : ""} ${shoes ? `Shoes: ${shoes.name}.` : ""}`.trim();
  return {
    name,
    items: refs,
    notes,
    score: paletteScore?.score ?? 5,
    colorScore: paletteScore?.score ?? 5,
    frenchScore: 70,
    violations: [],
    colorReason: paletteScore?.reason ?? "Compatible palette",
  };
}

export function generateOutfit(
  items: ClothingItem[],
  mode: OutfitMode,
  userId: string
): {
  name: string;
  items: OutfitItemRef[];
  notes: string;
  score: number;
  colorScore: number;
  frenchScore: number;
  violations: string[];
  colorReason: string;
} {
  const formalItems = items.filter((i) => formalityCompatible(i, mode));
  const pool = formalItems.length >= 4 ? formalItems : items;
  const byCategory = {
    tops: pool.filter((i) => i.category === "tops"),
    bottoms: pool.filter((i) => i.category === "bottoms"),
    shoes: pool.filter((i) => i.category === "shoes"),
    accessories: pool.filter((i) => i.category === "accessories"),
  };

  const combinations: Array<{
    top: ClothingItem;
    bottom: ClothingItem;
    shoe?: ClothingItem;
    accessory?: ClothingItem;
    score: number;
    colorScore: number;
    frenchScore: number;
    colorReason: string;
    violations: string[];
  }> = [];

  for (const top of byCategory.tops.slice(0, 5)) {
    for (const bottom of byCategory.bottoms.slice(0, 4)) {
      const colorResult = scoreColorCompatibility(top.color, bottom.color);
      const bestShoe = byCategory.shoes
        .map((shoe) => ({
          shoe,
          score: scoreColorCompatibility(shoe.color, bottom.color).score,
        }))
        .sort((a, b) => b.score - a.score)[0]?.shoe;
      const bestAccessory = byCategory.accessories.find((accessory) => {
        const allColors = [top.color, bottom.color, bestShoe?.color].filter(
          (color): color is string => Boolean(color)
        );
        const nonNeutrals = allColors.filter((color) => !isNeutral(color));
        if (nonNeutrals.length >= 3 && !isNeutral(accessory.color)) return false;
        return true;
      });
      const frenchResult = scoreFrenchMethod(top, bottom);
      assignColorRoles(
        [top, bottom, bestShoe, bestAccessory]
          .filter((item): item is ClothingItem => Boolean(item))
          .map((item) => ({ name: item.name, color: item.color, category: item.category }))
      );
      const combinedScore =
        colorResult.score * 0.45 +
        (frenchResult.score / 10) * 0.35 +
        (top.isFavorite || bottom.isFavorite ? 0.5 : 0) +
        (top.usageCount < 3 || bottom.usageCount < 3 ? 0.3 : 0) +
        (top.usageCount > 20 || bottom.usageCount > 20 ? -0.2 : 0) -
        recentItemPenalty(userId, top) -
        recentItemPenalty(userId, bottom);

      combinations.push({
        top,
        bottom,
        shoe: bestShoe,
        accessory: bestAccessory,
        score: combinedScore,
        colorScore: colorResult.score,
        frenchScore: frenchResult.score,
        colorReason: colorResult.reason,
        violations: frenchResult.tips,
      });

      if (combinations.length >= 20) break;
    }
    if (combinations.length >= 20) break;
  }

  combinations.sort((a, b) => b.score - a.score);

  if (combinations.length === 0) {
    try {
      return fallbackGenerateOutfit(items, mode);
    } catch {
      return {
        name: "Curated Look",
        items: [],
        notes: "Add more wardrobe pieces to generate a complete outfit.",
        score: 0,
        colorScore: 0,
        frenchScore: 0,
        violations: ["Not enough items to build an outfit"],
        colorReason: "Compatible palette",
      };
    }
  }

  const rand = Math.random();
  const randomVarietyPick = combinations.slice(3, 7);
  const picked =
    rand < 0.30 ? combinations[0] :
    rand < 0.60 ? combinations[1] ?? combinations[0] :
    rand < 0.85 ? combinations[2] ?? combinations[0] :
    randomVarietyPick.length > 0
      ? randomVarietyPick[Math.floor(Math.random() * randomVarietyPick.length)]
      : combinations[2] ?? combinations[1] ?? combinations[0];

  const refs: OutfitItemRef[] = [];
  refs.push({ itemId: picked.top.id, role: "top" });
  refs.push({ itemId: picked.bottom.id, role: "bottom" });
  if (picked.shoe) refs.push({ itemId: picked.shoe.id, role: "shoes" });
  if (picked.accessory) refs.push({ itemId: picked.accessory.id, role: "accessory" });
  rememberRecentlyUsedItems(userId, [picked.top.id, picked.bottom.id]);

  const mood =
    mode === "casual" ? "Effortless" : mode === "formal" ? "Refined" : mode === "party" ? "Statement" : mode === "wedding" ? "Graceful" : "Curated";
  const name = `${mood} ${picked.top.color} & ${picked.bottom.color} Look`;
  const base = occasionDescription(mode);
  const notes = `${base} ${picked.colorReason}. Top: ${picked.top.name}. Bottom: ${picked.bottom.name}.${picked.shoe ? ` Shoes: ${picked.shoe.name}.` : ""}`;

  return {
    name,
    items: refs,
    notes,
    score: picked.score,
    colorScore: picked.colorScore,
    frenchScore: picked.frenchScore,
    violations: picked.violations,
    colorReason: picked.colorReason,
  };
}
