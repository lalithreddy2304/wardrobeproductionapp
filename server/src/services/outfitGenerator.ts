import { scoreColorCompatibility, scoreOutfitPalette, isNeutral } from "./ittenColorTheory.js";
import { scoreFrenchMethod, assignColorRoles } from "./frenchCapsuleMethod.js";
import type { ClothingItem, OutfitItemRef } from "../types.js";

export type OutfitMode = "random" | "casual" | "formal" | "party" | "wedding" | "office" | "date" | "travel";

type OccasionRule = {
  preferTags: string[];
  avoidTags: string[];
  targetFormality: number;
  categoryTags: Partial<Record<ClothingItem["category"], string[]>>;
};

const OCCASION_RULES: Record<OutfitMode, OccasionRule> = {
  random: {
    preferTags: ["minimal", "classic", "smart-casual"],
    avoidTags: [],
    targetFormality: 3,
    categoryTags: {},
  },
  casual: {
    preferTags: ["casual", "cotton", "linen", "denim", "minimal", "travel"],
    avoidTags: ["wedding", "evening"],
    targetFormality: 2,
    categoryTags: {
      bottoms: ["denim", "chino", "cotton"],
      shoes: ["sneakers", "casual", "travel"],
    },
  },
  formal: {
    preferTags: ["formal", "smart", "tailored", "office", "wool", "leather"],
    avoidTags: ["gym", "beach"],
    targetFormality: 4,
    categoryTags: {
      tops: ["blazer", "shirt", "silk", "formal"],
      bottoms: ["tailored", "trousers", "formal"],
      shoes: ["formal", "leather", "chelsea"],
      accessories: ["watch", "belt", "formal"],
    },
  },
  office: {
    preferTags: ["office", "smart-casual", "tailored", "chino", "wool", "minimal"],
    avoidTags: ["wedding", "party", "beach", "gym"],
    targetFormality: 3.5,
    categoryTags: {
      tops: ["sweater", "shirt", "blazer", "office"],
      bottoms: ["chino", "tailored", "trousers", "office"],
      shoes: ["chelsea", "leather", "formal"],
      accessories: ["watch", "belt", "minimal"],
    },
  },
  party: {
    preferTags: ["party", "trendy", "accent", "silk", "date", "jacket"],
    avoidTags: ["wedding", "cozy", "office", "formal"],
    targetFormality: 2.6,
    categoryTags: {
      tops: ["jacket", "silk", "trendy", "party"],
      bottoms: ["denim", "trendy", "casual", "wide-leg"],
      shoes: ["sneakers", "casual", "party", "minimal"],
      accessories: ["jewelry", "accent", "statement"],
    },
  },
  date: {
    preferTags: ["date", "silk", "knit", "smart-casual", "accent", "minimal"],
    avoidTags: ["gym", "beach"],
    targetFormality: 3,
    categoryTags: {
      tops: ["silk", "knit", "blouse", "sweater"],
      bottoms: ["tailored", "skirt", "denim"],
      shoes: ["chelsea", "heels", "leather"],
      accessories: ["watch", "jewelry", "accent"],
    },
  },
  travel: {
    preferTags: ["travel", "casual", "cotton", "denim", "chino", "minimal"],
    avoidTags: ["wedding", "heels", "evening"],
    targetFormality: 2,
    categoryTags: {
      tops: ["cotton", "casual", "knit"],
      bottoms: ["denim", "chino", "travel"],
      shoes: ["sneakers", "travel", "casual"],
      accessories: ["belt", "minimal"],
    },
  },
  wedding: {
    preferTags: ["wedding", "formal", "tailored", "silk", "blazer", "jewelry"],
    avoidTags: ["casual", "denim", "sneakers", "travel"],
    targetFormality: 4.5,
    categoryTags: {
      tops: ["blazer", "formal", "silk"],
      bottoms: ["formal", "tailored", "skirt", "trousers"],
      shoes: ["formal", "heels", "leather"],
      accessories: ["watch", "jewelry", "formal"],
    },
  },
};

const recentlyUsedItems = new Map<string, string[]>();
const recentlyUsedSignatures = new Map<string, string[]>();

function tagsFor(item: ClothingItem): string[] {
  return item.tags.map((tag) => tag.toLowerCase());
}

function textFor(item: ClothingItem): string {
  return `${item.name} ${item.category} ${item.color} ${item.tags.join(" ")}`.toLowerCase();
}

function matchesAny(item: ClothingItem, needles: string[]): boolean {
  const text = textFor(item);
  return needles.some((needle) => text.includes(needle.toLowerCase()));
}

function score(item: ClothingItem, mode: OutfitMode): number {
  const rules = OCCASION_RULES[mode];
  let s = 1;
  if (matchesAny(item, rules.avoidTags)) s -= 4;
  if (matchesAny(item, rules.preferTags)) s += 2;
  if (matchesAny(item, rules.categoryTags[item.category] ?? [])) s += 2.5;
  if (item.isFavorite) s += 0.5;
  if (item.usageCount > 5 && item.usageCount < 25) s += 0.3;
  return Math.max(0.1, s);
}

function recentItemPenalty(userId: string, item: ClothingItem): number {
  const recent = recentlyUsedItems.get(userId) ?? [];
  return recent.filter((itemId) => itemId === item.id).length * 0.45;
}

function outfitSignature(itemIds: string[]): string {
  return [...itemIds].sort().join("|");
}

function repeatPenalty(userId: string, itemIds: string[]): number {
  const recentSignatures = recentlyUsedSignatures.get(userId) ?? [];
  const signature = outfitSignature(itemIds);
  return recentSignatures.includes(signature) ? 4 : 0;
}

function rememberRecentlyUsedItems(userId: string, itemIds: string[]) {
  const recent = recentlyUsedItems.get(userId) ?? [];
  recentlyUsedItems.set(userId, [...recent, ...itemIds].slice(-6));
  const signatures = recentlyUsedSignatures.get(userId) ?? [];
  recentlyUsedSignatures.set(userId, [outfitSignature(itemIds), ...signatures].slice(0, 8));
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
  if (tags.some((tag) => ["gym", "beach", "relaxed"].includes(tag))) return 1;
  if (tags.some((tag) => ["casual", "cotton", "denim", "travel"].includes(tag))) return 2;
  if (tags.some((tag) => ["minimal", "linen", "everyday", "smart-casual", "chino", "date", "party"].includes(tag))) return 3;
  if (tags.some((tag) => ["formal", "silk", "wool", "blazer", "tailored", "office", "leather"].includes(tag))) return 4;
  if (tags.some((tag) => ["wedding", "gown", "evening"].includes(tag))) return 5;
  return 2;
}

function formalityCompatible(item: ClothingItem, mode: OutfitMode): boolean {
  const formality = getItemFormality(item);
  const ranges: Record<OutfitMode, [number, number]> = {
    casual: [1, 2],
    random: [1, 4],
    formal: [3, 5],
    office: [3, 4],
    party: [2, 4],
    date: [2, 4],
    travel: [1, 3],
    wedding: [4, 5],
  };
  const [min, max] = ranges[mode];
  return formality >= min && formality <= max;
}

function occasionDescription(mode: OutfitMode): string {
  return mode === "formal"
    ? "A tailored silhouette with structured lines. Keep accessories minimal and polished."
    : mode === "office"
    ? "Smart-casual polish for work: structured, comfortable, and quietly refined."
    : mode === "casual"
    ? "Relaxed, everyday elegance. Layer lightly and prioritize comfort without sacrificing style."
    : mode === "party"
    ? "Elevated textures and a confident palette. Let one statement piece carry the look."
    : mode === "date"
    ? "Balanced and attractive: flattering color contrast, considered layers, and one polished detail."
    : mode === "travel"
    ? "Comfortable, versatile, and walking-friendly while still feeling intentional."
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
    mode === "casual" ? "Effortless" :
    mode === "formal" || mode === "office" ? "Refined" :
    mode === "party" ? "Statement" :
    mode === "date" ? "Balanced" :
    mode === "travel" ? "Versatile" :
    mode === "wedding" ? "Graceful" :
    "Curated";
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

function clampScore(value: number): number {
  return Math.max(0, Math.min(10, value));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function occasionFitScore(mode: OutfitMode, selected: ClothingItem[]): number {
  const rule = OCCASION_RULES[mode];
  if (mode === "random") return 6.5;

  const scores = selected.map((item) => {
    let value = 4;
    if (matchesAny(item, rule.preferTags)) value += 2;
    if (matchesAny(item, rule.categoryTags[item.category] ?? [])) value += 2.5;
    if (matchesAny(item, rule.avoidTags)) value -= 4;
    if (item.isFavorite) value += 0.3;
    return clampScore(value);
  });

  return clampScore(average(scores));
}

function formalityScore(mode: OutfitMode, selected: ClothingItem[]): number {
  const target = OCCASION_RULES[mode].targetFormality;
  const closeness = selected.map((item) => {
    const distance = Math.abs(getItemFormality(item) - target);
    return clampScore(10 - distance * 2.4);
  });
  return clampScore(average(closeness));
}

function categoryBalanceScore(selected: ClothingItem[]): number {
  const categories = new Set(selected.map((item) => item.category));
  let score = 0;
  if (categories.has("tops")) score += 2.5;
  if (categories.has("bottoms")) score += 2.5;
  if (categories.has("shoes")) score += 2.5;
  if (categories.has("accessories")) score += 1.5;
  if (selected.length >= 4) score += 1;
  return clampScore(score);
}

function diversityScore(userId: string, selected: ClothingItem[]): number {
  const colors = new Set(selected.map((item) => item.color.toLowerCase()));
  const tagFamilies = new Set(selected.flatMap((item) => tagsFor(item)));
  const recentPenalty = selected.reduce((sum, item) => sum + recentItemPenalty(userId, item), 0);
  const underusedBoost = selected.filter((item) => item.usageCount < 5).length * 0.45;

  return clampScore(5.5 + Math.min(colors.size, 4) * 0.6 + Math.min(tagFamilies.size, 8) * 0.18 + underusedBoost - recentPenalty);
}

function finalWeightedScore(input: {
  occasion: number;
  color: number;
  formality: number;
  balance: number;
  diversity: number;
  french: number;
  repeatPenalty: number;
}): number {
  return (
    input.occasion * 0.36 +
    input.color * 0.18 +
    input.formality * 0.18 +
    input.balance * 0.12 +
    input.diversity * 0.08 +
    input.french * 0.08 -
    input.repeatPenalty
  );
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
    occasionScore: number;
    formalityScore: number;
    balanceScore: number;
    diversityScore: number;
    repeatPenalty: number;
    frenchScore: number;
    colorReason: string;
    violations: string[];
  }> = [];

  const topCandidates = byCategory.tops
    .map((item) => ({ item, weight: score(item, mode) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8)
    .map(({ item }) => item);
  const bottomCandidates = byCategory.bottoms
    .map((item) => ({ item, weight: score(item, mode) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8)
    .map(({ item }) => item);
  const shoeCandidates = byCategory.shoes
    .map((item) => ({ item, weight: score(item, mode) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6)
    .map(({ item }) => item);
  const accessoryCandidates = [
    undefined,
    ...byCategory.accessories
      .map((item) => ({ item, weight: score(item, mode) }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 6)
      .map(({ item }) => item),
  ];

  for (const top of topCandidates) {
    for (const bottom of bottomCandidates) {
      for (const shoe of shoeCandidates.length ? shoeCandidates : [undefined]) {
        for (const accessory of accessoryCandidates) {
          const selected = [top, bottom, shoe, accessory].filter(
            (item): item is ClothingItem => Boolean(item)
          );

          if (accessory) {
            const nonNeutrals = selected.map((item) => item.color).filter((color) => !isNeutral(color));
            if (nonNeutrals.length >= 4 && !isNeutral(accessory.color)) continue;
          }
          if (mode === "wedding" && shoe && matchesAny(shoe, ["sneakers", "travel", "casual"])) continue;
          if (mode === "travel" && shoe && matchesAny(shoe, ["heels", "wedding"])) continue;
          if (mode === "party" && shoe && matchesAny(shoe, ["wedding"])) continue;

          const paletteResult = scoreOutfitPalette(selected.map((item) => item.color));
          const topBottomColor = scoreColorCompatibility(top.color, bottom.color);
          const colorScore = clampScore(paletteResult.score * 0.72 + topBottomColor.score * 0.28);
          const outfitOccasionScore = occasionFitScore(mode, selected);
          const outfitFormalityScore = formalityScore(mode, selected);
          const balanceScore = categoryBalanceScore(selected);
          const outfitDiversityScore = diversityScore(userId, selected);
          const itemIds = selected.map((item) => item.id);
          const outfitRepeatPenalty =
            repeatPenalty(userId, itemIds) +
            selected.reduce((sum, item) => sum + recentItemPenalty(userId, item), 0);
          const frenchResult = scoreFrenchMethod(top, bottom, shoe, accessory ? [accessory] : []);
          assignColorRoles(
            selected.map((item) => ({ name: item.name, color: item.color, category: item.category }))
          );
          const combinedScore = finalWeightedScore({
            occasion: outfitOccasionScore,
            color: colorScore,
            formality: outfitFormalityScore,
            balance: balanceScore,
            diversity: outfitDiversityScore,
            french: frenchResult.score / 10,
            repeatPenalty: outfitRepeatPenalty,
          });

          combinations.push({
            top,
            bottom,
            shoe,
            accessory,
            score: combinedScore,
            colorScore,
            occasionScore: outfitOccasionScore,
            formalityScore: outfitFormalityScore,
            balanceScore,
            diversityScore: outfitDiversityScore,
            repeatPenalty: outfitRepeatPenalty,
            frenchScore: frenchResult.score,
            colorReason: paletteResult.reason,
            violations: frenchResult.tips,
          });
        }
      }
    }
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
  rememberRecentlyUsedItems(
    userId,
    [picked.top.id, picked.bottom.id, picked.shoe?.id, picked.accessory?.id]
      .filter((itemId): itemId is string => Boolean(itemId))
  );

  const mood =
    mode === "casual" ? "Effortless" :
    mode === "formal" || mode === "office" ? "Refined" :
    mode === "party" ? "Statement" :
    mode === "date" ? "Balanced" :
    mode === "travel" ? "Versatile" :
    mode === "wedding" ? "Graceful" :
    "Curated";
  const name = `${mood} ${picked.top.color} & ${picked.bottom.color} Look`;
  const base = occasionDescription(mode);
  const colorReason = picked.colorReason.replace(/\.$/, "");
  const notes = `${base} ${colorReason}. Top: ${picked.top.name}. Bottom: ${picked.bottom.name}.${picked.shoe ? ` Shoes: ${picked.shoe.name}.` : ""}${picked.accessory ? ` Accessory: ${picked.accessory.name}.` : ""} Scored for occasion ${picked.occasionScore.toFixed(1)}/10, color ${picked.colorScore.toFixed(1)}/10, diversity ${picked.diversityScore.toFixed(1)}/10.`;

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
