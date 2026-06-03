import Groq from "groq-sdk";
import type { Category, ClothingItem, Outfit } from "../types.js";
import {
  complementaryScore,
  getHueFamily,
  scoreColorCompatibility,
} from "./ittenColorTheory.js";

export type AIMessage = { role: "user" | "assistant"; content: string };
export type AIProfile = { gender?: string; skinTone?: string; styleGoal?: string };
type SmartBuyVerdict = "Strong Buy" | "Good Addition" | "Consider It" | "Think Twice" | "Avoid";
type SmartBuyBreakdownRow = {
  key: "uniqueness" | "occasion" | "color" | "value" | "balance";
  label: string;
  score: number;
  max: number;
  note: string;
};

const CATEGORY_VALUES: readonly Category[] = ["tops", "bottoms", "shoes", "accessories"];

function isCategory(category: string): category is Category {
  return (CATEGORY_VALUES as readonly string[]).includes(category);
}

function getSkinToneGuidance(skinTone?: string): string {
  switch (skinTone) {
    case "fair":
      return "Best colors: navy, burgundy, emerald, pastels, jewel tones. Avoid: orange, yellow-green.";
    case "light":
      return "Best colors: warm neutrals, dusty rose, olive, camel, coral. Avoid: harsh neons.";
    case "medium":
      return "Best colors: earth tones, burgundy, warm camel, forest green, rust. Most colors work well.";
    case "medium-deep":
      return "Best colors: rich jewel tones, gold, burnt orange, deep red, warm brown.";
    case "deep":
      return "Best colors: bright colors, white, gold, bold prints - almost anything flatters.";
    default:
      return "Provide general color advice.";
  }
}

function stylistSystem(profile?: AIProfile): string {
  const profileContext = profile ? `
User profile:
- Gender: ${profile.gender ?? "not specified"}
- Skin tone: ${profile.skinTone ?? "not specified"}
- Goal: ${profile.styleGoal ?? "not specified"}

Skin tone color guidance:
${getSkinToneGuidance(profile.skinTone)}
` : "";

  return `You are an elite personal fashion stylist for the app "My Wardrobe".
${profileContext}
Be concise (2-4 sentences). Tone: calm, luxurious, confident.
Use ONLY items from the user's wardrobe when suggesting outfits.
Give advice relevant to the user's gender and skin tone.
When recommending an outfit, include:
- The occasion you are styling for, inferred from the user's message.
- 2-4 exact wardrobe item names from the wardrobe context.
- The main colors and why they work together.
- One short reason the outfit works for the occasion.
- One alternative exact wardrobe item the user could swap in.
Never invent item names, colors, or categories. If the wardrobe is missing a needed category, say what is missing and style around the closest available item.
No markdown headers or bullet lists unless asked.`;
}

function wardrobeContext(items: ClothingItem[], outfits: Outfit[]): string {
  if (items.length === 0) return "Wardrobe: empty.";
  const lines = items.slice(0, 40).map(
    (i) => `- ${i.name} (${i.category}, ${i.color}, tags: ${i.tags.join(", ") || "none"})`
  );
  const saved = outfits.length
    ? `\nSaved outfits: ${outfits.length} (${outfits.filter((o) => o.isFavorite).length} favorites).`
    : "";
  return `Wardrobe (${items.length} pieces):\n${lines.join("\n")}${saved}`;
}

function getGroqClient() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not configured");
  return new Groq({ apiKey: key });
}

function cleanJsonText(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

async function callGroq(
  system: string,
  userPrompt: string,
  history: AIMessage[] = []
): Promise<string> {
  const groq = getGroqClient();

  const messages = [
    { role: "system" as const, content: system },
    ...history.slice(-8).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userPrompt },
  ];

  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    messages,
    temperature: 0.7,
    max_tokens: 512,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty response from Groq");
  return text;
}

async function callOpenAI(
  system: string,
  userPrompt: string,
  history: AIMessage[] = []
): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not configured");

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const messages = [
    { role: "system" as const, content: system },
    ...history.slice(-8).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userPrompt },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 512 }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty response from OpenAI");
  return text;
}

export function isAIConfigured(): boolean {
  return !!(process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY);
}

export async function stylistReply(
  userMessage: string,
  items: ClothingItem[],
  outfits: Outfit[],
  history: AIMessage[] = [],
  profile?: AIProfile
): Promise<string> {
  const context = wardrobeContext(items, outfits);
  const prompt = `${context}\n\nUser: ${userMessage}\n\nRespond with concrete wardrobe advice. If you suggest an outfit, name actual items from the wardrobe, explain the color/occasion logic, and include one alternative item.`;
  const system = stylistSystem(profile);

  if (process.env.GROQ_API_KEY) {
    return callGroq(system, prompt, history);
  }
  if (process.env.OPENAI_API_KEY) {
    return callOpenAI(system, prompt, history);
  }

  throw new Error(
    "No AI provider configured. Add GROQ_API_KEY or OPENAI_API_KEY to server/.env"
  );
}

export async function generateOutfitNotes(
  mode: string,
  itemNames: string[],
  palette: string[],
  score?: number,
  violations?: string[],
  colorReason?: string,
  profile?: AIProfile
): Promise<string> {
  void palette;
  const prompt = `You are a luxury fashion stylist. Write ONE elegant sentence (max 34 words).
Occasion: ${mode}.
Pieces: ${itemNames.join(", ")}.
Color theory verdict: ${colorReason ?? "harmonious palette"}.
Style score: ${score !== undefined ? Math.round(score * 10) : "N/A"}/100.
${violations?.length ? `Style considerations: ${violations.join(", ")}` : "All style rules passed."}
${profile?.skinTone ? `Skin tone: ${profile.skinTone}. ${getSkinToneGuidance(profile.skinTone)}` : ""}
${profile?.gender ? `Gender: ${profile.gender}.` : ""}
Describe why these exact pieces work for ${mode}, including the occasion and colors.
Reference actual piece names. No quotes. No markdown.`;

  if (process.env.GROQ_API_KEY) {
    return callGroq(
      "You write ultra-short luxury fashion captions.",
      prompt
    );
  }
  if (process.env.OPENAI_API_KEY) {
    return callOpenAI(
      "You write ultra-short luxury fashion captions.",
      prompt
    );
  }
  throw new Error("No AI provider configured");
}

export async function analyzeClothingImage(
  imageBase64: string,
  mimeType: string,
  wardrobeItems: ClothingItem[] = [],
  profile?: AIProfile
): Promise<{
  name: string;
  category: "tops" | "bottoms" | "shoes" | "accessories";
  color: string;
  pattern: string;
  style: string;
  fabric: string;
  fit: string;
  occasion: string[];
  season: string[];
  dominantColors: string[];
  styleNotes: string;
  wardrobeCompatibility: string;
  genderMismatch?: boolean;
}> {
  const fallback = {
    name: "Clothing Item",
    category: "tops" as const,
    color: "Unknown",
    pattern: "solid",
    style: "casual",
    fabric: "cotton",
    fit: "regular",
    occasion: ["casual"],
    season: ["spring", "summer", "fall", "winter"],
    dominantColors: [] as string[],
    styleNotes: "",
    wardrobeCompatibility: "",
    genderMismatch: false,
  };
  const userGender = profile?.gender ?? "unspecified gender";

  const wardrobeSummary = wardrobeItems.length === 0
    ? "Empty wardrobe"
    : Object.entries(
        wardrobeItems.reduce((acc, item) => {
          acc[item.category] = acc[item.category] || [];
          acc[item.category].push(`${item.name} (${item.color})`);
          return acc;
        }, {} as Record<string, string[]>)
      ).map(([cat, names]) => `${cat}: ${names.join(", ")}`).join("\n");

  const groq = getGroqClient();
  const response = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
            },
          },
          {
            type: "text",
            text: `Analyze this clothing item in detail.

The user is ${userGender}. Only identify clothing appropriate for ${userGender}. If the item appears to be for a different gender, still describe what you see but flag it in a new field called genderMismatch: true.

Existing wardrobe for context:
${wardrobeSummary}

Return ONLY a JSON object, no markdown, no explanation:
{
  "name": "descriptive item name (e.g. Red Black Checked Flannel Shirt)",
  "category": "tops | bottoms | shoes | accessories",
  "color": "primary color (e.g. Red, Navy, Charcoal)",
  "pattern": "solid | checked | striped | floral | printed | graphic | geometric | plain",
  "style": "casual | smart-casual | formal | streetwear | athletic | bohemian",
  "fabric": "cotton | denim | silk | wool | linen | synthetic | leather | knit",
  "fit": "slim | regular | relaxed | oversized | fitted",
  "occasion": ["casual", "work", "formal", "party", "weekend", "gym"],
  "season": ["spring", "summer", "fall", "winter"],
  "dominantColors": ["color1", "color2"],
  "styleNotes": "one sentence describing how to wear this piece",
  "wardrobeCompatibility": "one sentence about how it fits with the existing wardrobe",
  "genderMismatch": false
}`,
          },
        ],
      },
    ],
    max_tokens: 500,
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) return fallback;

  try {
    const parsed = JSON.parse(cleanJsonText(text)) as Partial<typeof fallback>;
    const validCategories: Category[] = ["tops", "bottoms", "shoes", "accessories"];
    return {
      name: parsed.name ? String(parsed.name) : fallback.name,
      category: validCategories.includes(parsed.category as Category)
        ? (parsed.category as Category)
        : fallback.category,
      color: parsed.color ? String(parsed.color) : fallback.color,
      pattern: parsed.pattern ? String(parsed.pattern) : fallback.pattern,
      style: parsed.style ? String(parsed.style) : fallback.style,
      fabric: parsed.fabric ? String(parsed.fabric) : fallback.fabric,
      fit: parsed.fit ? String(parsed.fit) : fallback.fit,
      occasion: Array.isArray(parsed.occasion) ? parsed.occasion.map(String) : fallback.occasion,
      season: Array.isArray(parsed.season) ? parsed.season.map(String) : fallback.season,
      dominantColors: Array.isArray(parsed.dominantColors)
        ? parsed.dominantColors.map(String)
        : fallback.dominantColors,
      styleNotes: parsed.styleNotes ? String(parsed.styleNotes) : fallback.styleNotes,
      wardrobeCompatibility: parsed.wardrobeCompatibility
        ? String(parsed.wardrobeCompatibility)
        : fallback.wardrobeCompatibility,
      genderMismatch: parsed.genderMismatch === true,
    };
  } catch (error) {
    console.warn(
      "Could not parse clothing image analysis:",
      error instanceof Error ? error.message : error
    );
    return fallback;
  }
}

function dominantWardrobeColor(items: ClothingItem[]): string | null {
  const counts = new Map<string, number>();
  for (const item of items) {
    const family = getHueFamily(item.color) ?? item.color.toLowerCase();
    counts.set(family, (counts.get(family) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function similarItemExists(
  detectedItem: { name: string; category: string; color: string; style: string },
  wardrobe: ClothingItem[]
): boolean {
  const nameWords = detectedItem.name.toLowerCase().split(/\s+/).filter((word) => word.length > 3);
  return wardrobe.some((item) => {
    const sameCategory = item.category === detectedItem.category;
    const similarColor = scoreColorCompatibility(item.color, detectedItem.color).score >= 8;
    const itemText = `${item.name} ${item.tags.join(" ")}`.toLowerCase();
    const similarName = nameWords.some((word) => itemText.includes(word));
    return sameCategory && (similarName || similarColor);
  });
}

export async function analyzeWardrobeCompatibility(
  detectedItem: {
    name: string;
    category: string;
    color: string;
    pattern?: string;
    style: string;
    occasion?: string[];
    wardrobeCompatibility?: string;
  },
  wardrobe: ClothingItem[],
  price?: number,
  profile?: AIProfile
): Promise<{
  score: number;
  verdict: SmartBuyVerdict;
  verdictDescription: string;
  matchingItems: string[];
  outfitCount: number;
  worthIt: string;
  reason: string;
  colorAnalysis: string;
  styleAdvice: string;
  scoreBreakdown: SmartBuyBreakdownRow[];
}> {
  const tops = wardrobe.filter((item) => item.category === "tops");
  const bottoms = wardrobe.filter((item) => item.category === "bottoms");
  const shoes = wardrobe.filter((item) => item.category === "shoes");
  const accessories = wardrobe.filter((item) => item.category === "accessories");

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
    "white",
    "off-white",
    "stone",
    "slate",
    "denim",
  ];

  const analyzedColor = detectedItem.color ?? "";
  const analyzedColorLower = analyzedColor.toLowerCase();
  const analyzedColorToken = analyzedColorLower.split(" ")[0] ?? "";
  const analyzedCategory = isCategory(detectedItem.category) ? detectedItem.category : "tops";
  const analyzedOccasions =
    detectedItem.occasion && detectedItem.occasion.length > 0
      ? detectedItem.occasion
      : ["casual"];

  const similarItems = wardrobe.filter((item) => {
    const sameCategory = item.category === analyzedCategory;
    const itemColor = item.color.toLowerCase();
    const itemColorToken = itemColor.split(" ")[0] ?? "";
    const sameColor =
      (analyzedColorToken.length > 0 && itemColor.includes(analyzedColorToken)) ||
      (itemColorToken.length > 0 && analyzedColorLower.includes(itemColorToken));

    return sameCategory && sameColor;
  });

  const duplicationScore =
    similarItems.length === 0 ? 25 :
    similarItems.length === 1 ? 15 :
    similarItems.length === 2 ? 8 :
    0;
  const duplicationNote =
    similarItems.length === 0
      ? "Nothing like this in your wardrobe"
      : similarItems.length === 1
        ? "You have 1 similar item already"
        : `You already have ${similarItems.length} similar items`;

  const wardrobeOccasions = wardrobe.flatMap((item) => item.tags ?? []);
  const occasionScore = Math.min(
    25,
    analyzedOccasions.reduce((total, occasion) => {
      const hasForOccasion = wardrobeOccasions.filter((tag) =>
        tag.toLowerCase().includes(occasion.toLowerCase())
      ).length;

      if (hasForOccasion === 0) return total + 12;
      if (hasForOccasion <= 2) return total + 6;
      return total + 2;
    }, 0)
  );
  const missingOccasion = analyzedOccasions.find((occasion) =>
    !wardrobeOccasions.some((tag) => tag.toLowerCase().includes(occasion.toLowerCase()))
  );
  const occasionNote = missingOccasion
    ? `You have nothing for ${missingOccasion}`
    : `Covers ${analyzedOccasions.join(", ")} with your current wardrobe`;

  const itemIsNeutral = NEUTRALS.some((neutral) => analyzedColorLower.includes(neutral));
  const compatibleItems = wardrobe.filter((item) => {
    const existingIsNeutral = NEUTRALS.some((neutral) =>
      item.color.toLowerCase().includes(neutral)
    );

    return itemIsNeutral || existingIsNeutral;
  });
  const compatibilityPct = wardrobe.length > 0 ? compatibleItems.length / wardrobe.length : 0.5;
  const colorScore = Math.round(compatibilityPct * 20);

  const currentCombos = tops.length * bottoms.length * Math.max(shoes.length, 1);
  const newCombos = (() => {
    const t = analyzedCategory === "tops" ? tops.length + 1 : tops.length;
    const b = analyzedCategory === "bottoms" ? bottoms.length + 1 : bottoms.length;
    const s = analyzedCategory === "shoes" ? shoes.length + 1 : shoes.length;
    return t * b * Math.max(s, 1);
  })();
  const outfitCount = Math.max(0, newCombos - currentCombos);

  const itemPrice = price ?? 0;
  const pricePerOutfit = outfitCount > 0 ? itemPrice / outfitCount : itemPrice;
  const priceScore =
    itemPrice === 0 ? 15 :
    pricePerOutfit < 200 ? 20 :
    pricePerOutfit < 500 ? 16 :
    pricePerOutfit < 1000 ? 12 :
    pricePerOutfit < 2000 ? 8 :
    pricePerOutfit < 5000 ? 4 :
    0;

  const categoryCounts: Record<Category, number> = {
    tops: tops.length,
    bottoms: bottoms.length,
    shoes: shoes.length,
    accessories: accessories.length,
  };
  const categoriesByNeed = (Object.entries(categoryCounts) as [Category, number][])
    .sort((a, b) => a[1] - b[1]);
  const balanceScore =
    analyzedCategory === categoriesByNeed[0]?.[0] ? 10 :
    analyzedCategory === categoriesByNeed[1]?.[0] ? 5 :
    0;

  const finalScore = Math.min(
    95,
    Math.max(5, duplicationScore + occasionScore + colorScore + priceScore + balanceScore)
  );
  const score = similarItems.length >= 3 ? Math.min(35, finalScore) : finalScore;

  const verdict: SmartBuyVerdict =
    score >= 75 ? "Strong Buy" :
    score >= 58 ? "Good Addition" :
    score >= 42 ? "Consider It" :
    score >= 25 ? "Think Twice" :
    "Avoid";

  const verdictDescription =
    score >= 75 ? "Fills a real gap, avoids duplication, and earns its place for the money" :
    score >= 58 ? "A useful addition with enough wardrobe value to justify consideration" :
    score >= 42 ? "Potentially useful, but the wardrobe benefit is mixed" :
    score >= 25 ? "There are clear reasons to pause before buying this" :
    "This does not improve your wardrobe enough to justify the purchase";

  const matchingItems = compatibleItems.slice(0, 8).map((item) => item.name);

  const dominant = dominantWardrobeColor(wardrobe);
  const worthIt =
    price && outfitCount > 0
      ? `At ₹${price}, this creates ${outfitCount} new outfits - ₹${Math.round(pricePerOutfit)} per outfit`
      : price
        ? `At ₹${price}, this is ₹${Math.round(pricePerOutfit)} per new outfit`
        : outfitCount > 0
          ? `This unlocks ${outfitCount} new outfit combinations`
          : "No price entered, so value is scored as neutral-good";

  let reason =
    detectedItem.wardrobeCompatibility ||
    (verdict === "Avoid"
      ? `Skip it for now. ${duplicationNote}, and the score does not show enough new wardrobe value.`
      : `${detectedItem.name} is a ${verdict.toLowerCase()} because ${duplicationNote.toLowerCase()} and it works with ${compatibleItems.length} of your ${wardrobe.length} pieces.`);

  if (process.env.GROQ_API_KEY && !detectedItem.wardrobeCompatibility) {
    const prompt = `A shopper is considering buying: ${detectedItem.name} (${detectedItem.color}, ${detectedItem.style})
${price ? `Price: ₹${price}` : ""}
Their wardrobe has ${wardrobe.length} items.
This item works with ${compatibleItems.length} of their pieces: ${matchingItems.slice(0, 5).join(", ")}
It would create ${outfitCount} new outfit combinations at ₹${Math.round(pricePerOutfit)} per new outfit.
Compatibility score: ${score}/100
Score drivers: uniqueness ${duplicationScore}/25, occasion fit ${occasionScore}/25, color match ${colorScore}/20, value ${priceScore}/20, balance ${balanceScore}/10.
${profile?.skinTone ? `Their skin tone is ${profile.skinTone}.` : ""}

Write a SHORT buying recommendation (3-4 sentences max):
1. Whether to buy it and why
2. Which specific wardrobe pieces it pairs best with
3. One styling tip
Be direct and honest. If score is low, say skip it clearly.`;

    try {
      reason = await callGroq("You are a direct, practical wardrobe shopping assistant.", prompt);
    } catch (error) {
      console.warn(
        "Smart Buy narrative failed:",
        error instanceof Error ? error.message : error
      );
    }
  }

  return {
    score,
    verdict,
    verdictDescription,
    matchingItems,
    outfitCount,
    worthIt,
    reason,
    colorAnalysis: dominant
      ? `${detectedItem.color} is compared against your dominant ${dominant} wardrobe palette. Works with ${compatibleItems.length} of your ${wardrobe.length} pieces.`
      : `Works with ${compatibleItems.length} of your ${wardrobe.length} pieces.`,
    styleAdvice: `Wear it in ${detectedItem.style} outfits with ${matchingItems.slice(0, 3).join(", ") || "your simplest wardrobe staples"} to make it feel intentional.`,
    scoreBreakdown: [
      {
        key: "uniqueness",
        label: "Uniqueness",
        score: duplicationScore,
        max: 25,
        note: duplicationNote,
      },
      {
        key: "occasion",
        label: "Occasion fit",
        score: occasionScore,
        max: 25,
        note: occasionNote,
      },
      {
        key: "color",
        label: "Color match",
        score: colorScore,
        max: 20,
        note: `Works with ${compatibleItems.length} of your ${wardrobe.length} pieces`,
      },
      {
        key: "value",
        label: "Value",
        score: priceScore,
        max: 20,
        note: itemPrice === 0 ? "No price entered" : `₹${Math.round(pricePerOutfit)} per new outfit`,
      },
      {
        key: "balance",
        label: "Balance",
        score: balanceScore,
        max: 10,
        note: balanceScore === 10
          ? `${analyzedCategory} is your most needed category`
          : balanceScore === 5
            ? `${analyzedCategory} helps your wardrobe balance`
            : `${analyzedCategory} is already relatively covered`,
      },
    ],
  };
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning. What's the occasion today?";
  if (h < 17) return "Good afternoon. How can I style you?";
  return "Good evening. Tell me what you're dressing for.";
}
