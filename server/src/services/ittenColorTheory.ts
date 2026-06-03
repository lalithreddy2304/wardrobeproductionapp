export const HUE_FAMILIES: Record<string, string[]> = {
  red: ["red", "crimson", "scarlet", "burgundy", "wine", "rose"],
  orange: ["orange", "rust", "terracotta", "peach", "coral", "cognac"],
  yellow: ["yellow", "mustard", "gold", "saffron", "amber"],
  green: ["green", "olive", "sage", "emerald", "forest", "khaki"],
  blue: ["blue", "navy", "cobalt", "sky", "denim", "indigo", "teal", "cyan"],
  purple: ["purple", "violet", "lavender", "plum", "lilac", "mauve"],
  pink: ["pink", "blush", "rose", "fuchsia", "magenta"],
  brown: ["brown", "tan", "camel", "chocolate", "mocha", "coffee", "beige", "nude"],
  white: ["white", "ivory", "cream", "off-white", "ecru"],
  black: ["black", "charcoal", "onyx", "jet"],
  grey: ["grey", "gray", "silver", "ash", "stone", "slate"],
};

export const ITTEN_COMPLEMENTARY: Record<string, string> = {
  red: "green",
  green: "red",
  orange: "blue",
  blue: "orange",
  yellow: "purple",
  purple: "yellow",
  pink: "green",
  navy: "camel",
  camel: "navy",
  rust: "teal",
  teal: "rust",
  mustard: "purple",
  olive: "burgundy",
  burgundy: "olive",
  cognac: "teal",
};

export const ITTEN_ANALOGOUS: Record<string, string[]> = {
  red: ["orange", "pink", "purple"],
  orange: ["red", "yellow", "brown"],
  yellow: ["orange", "green", "gold"],
  green: ["yellow", "teal", "olive"],
  teal: ["green", "blue"],
  blue: ["teal", "purple", "navy"],
  purple: ["blue", "pink", "red"],
  pink: ["red", "purple"],
  brown: ["orange", "yellow"],
};

export const NEUTRALS = [
  "black",
  "white",
  "grey",
  "gray",
  "cream",
  "ivory",
  "beige",
  "nude",
  "stone",
  "charcoal",
  "tan",
  "navy",
  "brown",
  "camel",
];

const LIGHT = ["white", "ivory", "cream", "yellow", "gold", "pink", "beige", "nude", "blush"];
const DARK = ["black", "charcoal", "navy", "burgundy", "forest", "plum", "chocolate", "indigo"];
const WARM = ["red", "orange", "yellow", "pink", "brown", "gold", "camel", "cognac", "rust", "coral", "peach"];
const COOL = ["blue", "purple", "green", "teal", "grey", "navy", "sage", "olive", "lavender", "mint"];
const MUTED = ["beige", "nude", "stone", "sage", "mauve", "slate", "blush", "dusty", "soft", "muted"];
const SATURATED = ["red", "royal", "emerald", "bright", "electric", "hot", "vivid", "neon"];

function normalize(color: string): string {
  return color.trim().toLowerCase();
}

function includesColor(words: string[], color: string): boolean {
  const normalized = normalize(color);
  return words.some((word) => normalized.includes(word));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function areAnalogous(c1: string, c2: string): boolean {
  const color1 = normalize(c1);
  const color2 = normalize(c2);
  const family1 = getHueFamily(color1);
  const family2 = getHueFamily(color2);

  return (
    ITTEN_ANALOGOUS[color1]?.includes(color2) ||
    ITTEN_ANALOGOUS[color2]?.includes(color1) ||
    (!!family1 && !!family2 && (
      ITTEN_ANALOGOUS[family1]?.includes(family2) ||
      ITTEN_ANALOGOUS[family2]?.includes(family1)
    ))
  );
}

export function getHueFamily(color: string): string | null {
  const normalized = normalize(color);

  for (const [family, colors] of Object.entries(HUE_FAMILIES)) {
    if (colors.some((candidate) => normalized.includes(candidate))) {
      return family;
    }
  }

  return null;
}

export function isNeutral(color: string): boolean {
  const normalized = normalize(color);
  const family = getHueFamily(normalized);
  return (
    includesColor(NEUTRALS, normalized) ||
    family === "white" ||
    family === "black" ||
    family === "grey"
  );
}

export function hueContrast(c1: string, c2: string): number {
  const color1 = normalize(c1);
  const color2 = normalize(c2);
  const family1 = getHueFamily(color1);
  const family2 = getHueFamily(color2);
  const neutral1 = isNeutral(color1);
  const neutral2 = isNeutral(color2);

  if (family1 && family1 === family2) return 2;
  if (neutral1 && neutral2) return 7;
  if (neutral1 || neutral2) return 8;
  if (areAnalogous(color1, color2)) return 6;
  if (complementaryScore(color1, color2) > 0) return 9;
  return 3;
}

export function lightDarkContrast(c1: string, c2: string): number {
  const light1 = includesColor(LIGHT, c1);
  const light2 = includesColor(LIGHT, c2);
  const dark1 = includesColor(DARK, c1);
  const dark2 = includesColor(DARK, c2);
  const mid1 = !light1 && !dark1;
  const mid2 = !light2 && !dark2;

  if ((light1 && dark2) || (dark1 && light2)) return 9;
  if ((light1 && mid2) || (mid1 && light2)) return 6;
  if ((dark1 && mid2) || (mid1 && dark2)) return 6;
  if (light1 && light2) return 4;
  if (dark1 && dark2) return 5;
  if (mid1 && mid2) return 3;
  return 3;
}

export function coldWarmContrast(c1: string, c2: string): number {
  const neutral1 = isNeutral(c1);
  const neutral2 = isNeutral(c2);
  const warm1 = includesColor(WARM, c1);
  const warm2 = includesColor(WARM, c2);
  const cool1 = includesColor(COOL, c1);
  const cool2 = includesColor(COOL, c2);

  if (neutral1 && neutral2) return 6;
  if (neutral1 || neutral2) return 8;
  if (warm1 && warm2) return 5;
  if (cool1 && cool2) return 5;
  if ((warm1 && cool2) || (cool1 && warm2)) return 7;
  return 5;
}

export function complementaryScore(c1: string, c2: string): number {
  const color1 = normalize(c1);
  const color2 = normalize(c2);
  const family1 = getHueFamily(color1);
  const family2 = getHueFamily(color2);

  if (ITTEN_COMPLEMENTARY[color1] === color2 || ITTEN_COMPLEMENTARY[color2] === color1) {
    return 10;
  }

  if (
    family1 &&
    family2 &&
    (ITTEN_COMPLEMENTARY[family1] === family2 || ITTEN_COMPLEMENTARY[family2] === family1)
  ) {
    return 7;
  }

  return 0;
}

export function saturationScore(c1: string, c2: string): number {
  const neutral1 = isNeutral(c1);
  const neutral2 = isNeutral(c2);
  const muted1 = includesColor(MUTED, c1);
  const muted2 = includesColor(MUTED, c2);
  const saturated1 = includesColor(SATURATED, c1);
  const saturated2 = includesColor(SATURATED, c2);

  if (neutral1 || neutral2) return 8;
  if (muted1 && muted2) return 8;
  if (saturated1 && saturated2) return 5;
  if ((muted1 && saturated2) || (saturated1 && muted2)) return 7;
  return 6;
}

export function scoreColorCompatibility(
  color1: string,
  color2: string
): {
  score: number;
  verdict: "excellent" | "good" | "acceptable" | "avoid";
  reason: string;
} {
  const c1 = normalize(color1);
  const c2 = normalize(color2);

  const hue = hueContrast(c1, c2);
  const ld = lightDarkContrast(c1, c2);
  const cw = coldWarmContrast(c1, c2);
  const comp = complementaryScore(c1, c2);
  const sat = saturationScore(c1, c2);

  const score = round1(
    (hue * 0.35) +
      (ld * 0.25) +
      (cw * 0.15) +
      (comp > 0 ? comp * 0.15 : sat * 0.15) +
      (sat * 0.10)
  );

  const verdict =
    score >= 8.0 ? "excellent" :
    score >= 6.5 ? "good" :
    score >= 5.0 ? "acceptable" :
    "avoid";

  const bothNeutral = isNeutral(c1) && isNeutral(c2);
  const oneNeutral = isNeutral(c1) || isNeutral(c2);
  const reason =
    comp >= 9 ? "Classic complementary pairing" :
    hue === 2 ? "Monochromatic - sophisticated and cohesive" :
    bothNeutral ? "All-neutral - timeless and versatile" :
    oneNeutral && hue >= 8 ? "Neutral anchor with accent color" :
    hue === 6 ? "Analogous harmony - naturally pleasing" :
    ld === 9 ? "Strong light-dark contrast - crisp and defined" :
    "Compatible palette";

  return { score, verdict, reason };
}

export function scoreOutfitPalette(colors: string[]): {
  score: number;
  reason: string;
} {
  if (colors.length < 2) {
    return { score: colors.length === 0 ? 0 : 7, reason: "Not enough colors to compare" };
  }

  const scores: number[] = [];
  for (let i = 0; i < colors.length; i += 1) {
    for (let j = i + 1; j < colors.length; j += 1) {
      scores.push(scoreColorCompatibility(colors[i], colors[j]).score);
    }
  }

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const nonNeutrals = colors.filter((color) => !isNeutral(color));
  let score = average;

  if (nonNeutrals.length > 3) {
    score -= (nonNeutrals.length - 3) * 2;
  }
  if (nonNeutrals.length === 0) {
    score += 1;
  }

  score = round1(clamp(score, 0, 10));

  return {
    score,
    reason: `Average palette compatibility is ${score}/10 across ${scores.length} pairings with ${nonNeutrals.length} non-neutral color${nonNeutrals.length === 1 ? "" : "s"}.`,
  };
}
