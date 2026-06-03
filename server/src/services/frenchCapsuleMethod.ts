import { isNeutral, scoreColorCompatibility } from "./ittenColorTheory.js";
import type { ClothingItem } from "../types.js";

export type ColorRole = "dominant" | "secondary" | "accent" | "neutral";

type RoleItem = {
  name: string;
  color: string;
  category: string;
  role: ColorRole;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sameColor(c1: string, c2: string): boolean {
  return c1.trim().toLowerCase() === c2.trim().toLowerCase();
}

function rolePriority(role: ColorRole): number {
  if (role === "accent") return 0;
  if (role === "secondary") return 1;
  if (role === "dominant") return 2;
  return 3;
}

export function assignColorRoles(
  items: Array<{ name: string; color: string; category: string }>
): Array<{ name: string; color: string; category: string; role: ColorRole }> {
  const dominantColors = items
    .filter((item) => item.category === "bottoms" && !isNeutral(item.color))
    .map((item) => item.color.trim().toLowerCase());

  const assigned: RoleItem[] = items.map((item) => {
    let role: ColorRole;

    if (isNeutral(item.color)) {
      role = "neutral";
    } else if (item.category === "bottoms") {
      role = "dominant";
    } else if (item.category === "tops") {
      role = "secondary";
    } else if (item.category === "accessories") {
      role = "accent";
    } else if (item.category === "shoes") {
      const shoeColor = item.color.trim().toLowerCase();
      role = dominantColors.includes(shoeColor) ? "neutral" : "accent";
    } else {
      role = "accent";
    }

    return { ...item, role };
  });

  const nonNeutralIndexes = assigned
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.role !== "neutral");

  if (nonNeutralIndexes.length > 3) {
    const extras = nonNeutralIndexes
      .sort((a, b) => {
        const byPriority = rolePriority(a.item.role) - rolePriority(b.item.role);
        return byPriority === 0 ? b.index - a.index : byPriority;
      })
      .slice(0, nonNeutralIndexes.length - 3);

    extras.forEach(({ index }) => {
      assigned[index] = { ...assigned[index], role: "neutral" };
    });
  }

  return assigned;
}

export function scoreFrenchMethod(
  top: ClothingItem,
  bottom: ClothingItem,
  shoe?: ClothingItem,
  accessories?: ClothingItem[]
): {
  score: number;
  colorCount: number;
  followsRule: boolean;
  tips: string[];
} {
  const items = [top, bottom, shoe, ...(accessories ?? [])].filter(
    (item): item is ClothingItem => Boolean(item)
  );
  const roles = assignColorRoles(items);
  const topBottomColors = new Set([top.color.toLowerCase(), bottom.color.toLowerCase()]);

  const nonNeutralColors = new Set(
    items.filter((item) => !isNeutral(item.color)).map((item) => item.color.toLowerCase())
  );
  const colorCount = nonNeutralColors.size;
  let score = 100;
  const tips: string[] = [];

  if (colorCount === 2) {
    score += 10;
  } else if (colorCount === 3) {
    score += 5;
  } else if (colorCount === 4) {
    score -= 20;
  } else if (colorCount >= 5) {
    score -= 40;
  }

  const bottomRole = roles.find((item) => item.name === bottom.name && sameColor(item.color, bottom.color))?.role;
  if (isNeutral(bottom.color) || bottomRole === "dominant") {
    score += 10;
  }

  const shoeRole = shoe
    ? roles.find((item) => item.name === shoe.name && sameColor(item.color, shoe.color))?.role
    : undefined;
  if (shoe && (shoeRole === "neutral" || isNeutral(shoe.color) || sameColor(shoe.color, bottom.color))) {
    score += 10;
  }

  const accessoryRoles = accessories
    ? roles.filter((roleItem) =>
        accessories.some((accessory) => accessory.name === roleItem.name && sameColor(accessory.color, roleItem.color))
      )
    : [];
  const accessoriesAreAccent = accessoryRoles.length > 0 && accessoryRoles.every((item) => {
    const color = item.color.toLowerCase();
    return item.role === "accent" && !topBottomColors.has(color);
  });
  if (accessoriesAreAccent) {
    score += 10;
  }

  if (colorCount > 3) {
    tips.push("Swap one piece for a neutral to simplify");
  }
  if (shoe && !isNeutral(shoe.color) && scoreColorCompatibility(shoe.color, bottom.color).score < 5.0) {
    tips.push("Try a neutral shoe to ground the look");
  }
  if (colorCount === 1) {
    tips.push("Add a small accent piece for visual interest");
  }
  if ((accessories?.length ?? 0) > 2) {
    tips.push("Edit accessories to one or two pieces");
  }

  const clampedScore = clamp(score, 0, 100);

  return {
    score: clampedScore,
    colorCount,
    followsRule: clampedScore >= 70,
    tips,
  };
}

export function capsuleVersatility(
  item: ClothingItem,
  wardrobe: ClothingItem[]
): {
  versatilityScore: number;
  pairsWith: ClothingItem[];
  outfitCount: number;
  strength: "hero" | "supporting" | "accent" | "niche";
} {
  const others = wardrobe.filter((wardrobeItem) => wardrobeItem.id !== item.id);

  const pairsWith = others.filter((other) => {
    const compat = scoreColorCompatibility(item.color, other.color);
    return compat.score >= 5.0;
  });

  const topsCount = pairsWith.filter((pair) => pair.category === "tops").length;
  const bottomsCount = pairsWith.filter((pair) => pair.category === "bottoms").length;
  const shoesCount = pairsWith.filter((pair) => pair.category === "shoes").length;

  let outfitCount = 0;
  if (item.category === "tops") {
    outfitCount = bottomsCount * Math.max(shoesCount, 1);
  } else if (item.category === "bottoms") {
    outfitCount = topsCount * Math.max(shoesCount, 1);
  } else if (item.category === "shoes") {
    outfitCount = topsCount * bottomsCount;
  } else if (item.category === "accessories") {
    outfitCount = topsCount * bottomsCount * Math.max(shoesCount, 1);
  }

  const versatilityScore = Math.min(100, outfitCount * 8 + pairsWith.length * 3);
  const strength =
    outfitCount >= 9 ? "hero" :
    outfitCount >= 4 ? "supporting" :
    outfitCount >= 1 ? "accent" :
    "niche";

  return {
    versatilityScore,
    pairsWith,
    outfitCount,
    strength,
  };
}
