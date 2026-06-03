import { Router } from "express";
import Groq from "groq-sdk";
import { requireAuth } from "../middleware/auth.js";
import { repo } from "../repository.js";
import type { Category, ClothingItem } from "../types.js";

type PackActivity = "business" | "beach" | "hiking" | "casual" | "formal event" | "gym";

interface PackRequest {
  destinationCity: string;
  tripStartDate: string;
  tripEndDate: string;
  activities: PackActivity[];
  wardrobeItems?: ClothingItem[];
}

interface PackQuantity {
  key: string;
  label: string;
  quantity: number;
  category?: Category;
  tags: string[];
  reason: string;
}

interface PackedWardrobeItem {
  id: string;
  wardrobeItemId: string;
  name: string;
  category: Category;
  color: string;
  tags: string[];
  imageUrl: string;
  fromWardrobe: true;
}

interface WardrobeMatch {
  requirementKey: string;
  label: string;
  requiredQuantity: number;
  fromWardrobe: PackedWardrobeItem[];
  missingQuantity: number;
  status: "from wardrobe" | "need to buy" | "mixed";
}

interface MissingItem {
  label: string;
  quantity: number;
  reason: string;
  suggestedType: string;
}

interface DayOutfitPlan {
  day: number;
  date: string;
  outfitName: string;
  items: string[];
  notes: string;
}

interface TripSummary {
  days: number;
  laundryNote?: boolean;
}

interface PackResponse {
  tripSummary: TripSummary;
  calculatedQuantities: PackQuantity[];
  wardrobeMatches: WardrobeMatch[];
  missingItems: MissingItem[];
  dayByDayOutfitPlan: DayOutfitPlan[];
}

const router = Router();
router.use(requireAuth);

const ACTIVITIES: PackActivity[] = ["business", "beach", "hiking", "casual", "formal event", "gym"];
const COLD_DESTINATIONS = [
  "alaska",
  "amsterdam",
  "berlin",
  "boston",
  "chicago",
  "copenhagen",
  "helsinki",
  "iceland",
  "london",
  "moscow",
  "new york",
  "oslo",
  "paris",
  "prague",
  "reykjavik",
  "seattle",
  "stockholm",
  "toronto",
  "vancouver",
  "vienna",
  "winter",
  "cold",
  "snow",
];

function tripDays(start: string, end: string): number {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  const diff = endDate.getTime() - startDate.getTime();
  return Math.floor(diff / 86_400_000) + 1;
}

function dateForDay(start: string, day: number): string {
  const date = new Date(`${start}T00:00:00`);
  date.setDate(date.getDate() + day - 1);
  return date.toISOString().slice(0, 10);
}

function destinationIsCold(destinationCity: string): boolean {
  const normalized = destinationCity.trim().toLowerCase();
  return COLD_DESTINATIONS.some((destination) => normalized.includes(destination));
}

function uniqueActivities(activities: unknown): PackActivity[] {
  if (!Array.isArray(activities)) return [];
  return Array.from(
    new Set(activities.filter((activity): activity is PackActivity => ACTIVITIES.includes(activity)))
  );
}

function isCategory(value: unknown): value is Category {
  return value === "tops" || value === "bottoms" || value === "shoes" || value === "accessories";
}

function clientWardrobeItems(items: unknown, userId: string): ClothingItem[] | null {
  if (!Array.isArray(items)) return null;

  const wardrobe = items.flatMap((raw): ClothingItem[] => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Partial<ClothingItem>;
    if (
      typeof item.id !== "string" ||
      typeof item.name !== "string" ||
      !isCategory(item.category) ||
      typeof item.color !== "string" ||
      typeof item.imageUrl !== "string"
    ) {
      return [];
    }

    return [{
      id: item.id,
      userId,
      name: item.name,
      category: item.category,
      color: item.color,
      tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
      imageUrl: item.imageUrl,
      usageCount: typeof item.usageCount === "number" ? item.usageCount : 0,
      isFavorite: item.isFavorite === true,
      createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
    }];
  });

  return wardrobe.length > 0 ? wardrobe : null;
}

function calculateQuantities(input: PackRequest, days: number): PackQuantity[] {
  const capsule =
    days <= 3
      ? { tops: 3, bottoms: 2, shoes: 2, layers: 1, underwear: days + 1, socks: days + 1 }
      : days <= 7
        ? { tops: 5, bottoms: 3, shoes: 2, layers: 2, underwear: 6, socks: 6 }
        : { tops: 7, bottoms: 4, shoes: 3, layers: 2, underwear: 8, socks: 8 };

  const quantities: PackQuantity[] = [
    {
      key: "tops",
      label: "Tops",
      quantity: capsule.tops,
      category: "tops",
      tags: ["shirt", "top", ...input.activities],
      reason: "5-4-3-2-1 capsule travel rule",
    },
    {
      key: "bottoms",
      label: "Bottoms",
      quantity: capsule.bottoms,
      category: "bottoms",
      tags: ["bottom", ...input.activities],
      reason: "5-4-3-2-1 capsule travel rule",
    },
    {
      key: "shoes",
      label: "Shoes",
      quantity: capsule.shoes,
      category: "shoes",
      tags: ["shoe", ...input.activities],
      reason: "5-4-3-2-1 capsule travel rule",
    },
    {
      key: "layers",
      label: "Layers",
      quantity: capsule.layers,
      category: "tops",
      tags: ["layer", "jacket", "outerwear", "blazer", "coat"],
      reason: "5-4-3-2-1 capsule travel rule",
    },
    {
      key: "underwear",
      label: "Underwear",
      quantity: capsule.underwear,
      tags: ["underwear"],
      reason: "5-4-3-2-1 capsule travel rule",
    },
    {
      key: "socks",
      label: "Socks",
      quantity: capsule.socks,
      tags: ["socks"],
      reason: "5-4-3-2-1 capsule travel rule",
    },
  ];

  const tops = quantities.find((quantity) => quantity.key === "tops");
  const shoes = quantities.find((quantity) => quantity.key === "shoes");
  const socks = quantities.find((quantity) => quantity.key === "socks");

  if (input.activities.includes("business")) {
    quantities.push({
      key: "blazers",
      label: "Blazers",
      quantity: 1,
      category: "tops",
      tags: ["blazer", "business", "formal"],
      reason: "Business activity modifier",
    });
    quantities.push({
      key: "formalShoes",
      label: "Formal shoes",
      quantity: 1,
      category: "shoes",
      tags: ["formal", "business", "leather"],
      reason: "Business activity modifier",
    });
    quantities.push({
      key: "formalTops",
      label: "Formal tops",
      quantity: 1,
      category: "tops",
      tags: ["formal", "business", "shirt"],
      reason: "Business activity modifier",
    });
  }

  if (input.activities.includes("beach")) {
    if (tops) tops.quantity += 1;
    if (shoes) shoes.quantity = Math.max(0, shoes.quantity - 1);
    quantities.push({
      key: "swimwear",
      label: "Swimwear",
      quantity: 1,
      tags: ["swimwear", "beach"],
      reason: "Beach activity modifier",
    });
    quantities.push({
      key: "sandals",
      label: "Sandals",
      quantity: 1,
      category: "shoes",
      tags: ["sandals", "beach"],
      reason: "Beach activity modifier - sandals fill one shoe slot",
    });
  }

  if (input.activities.includes("hiking")) {
    if (socks) socks.quantity += Math.min(days, 3);
    quantities.push({
      key: "technicalLayer",
      label: "Technical layer",
      quantity: 1,
      category: "tops",
      tags: ["technical", "hiking", "layer"],
      reason: "Hiking activity modifier",
    });
  }

  if (input.activities.includes("formal event")) {
    quantities.push({
      key: "formalOutfit",
      label: "Formal outfit",
      quantity: 1,
      category: "tops",
      tags: ["formal", "event"],
      reason: "Formal event activity modifier outside base quantities",
    });
  }

  if (input.activities.includes("gym")) {
    quantities.push({
      key: "gymSets",
      label: "Gym sets",
      quantity: Math.min(days, 3),
      category: "tops",
      tags: ["gym", "athletic", "workout"],
      reason: "Gym activity modifier",
    });
  }

  return quantities;
}

function toPackedItem(item: ClothingItem): PackedWardrobeItem {
  return {
    id: item.id,
    wardrobeItemId: item.id,
    name: item.name,
    category: item.category,
    color: item.color,
    tags: item.tags,
    imageUrl: item.imageUrl,
    fromWardrobe: true,
  };
}

const NEUTRAL_COLORS = ["black", "white", "navy", "grey", "beige", "cream", "camel", "tan", "charcoal"];

function hasActivityTag(item: ClothingItem, activities: PackActivity[]): boolean {
  const itemTags = item.tags.map((tag) => tag.toLowerCase());
  return activities.some((activity) => itemTags.includes(activity.toLowerCase()));
}

function hasNeutralColor(item: ClothingItem): boolean {
  const color = item.color.toLowerCase();
  return NEUTRAL_COLORS.some((neutral) => color.includes(neutral));
}

function pickSlotItem(
  wardrobe: ClothingItem[],
  requirement: PackQuantity,
  activities: PackActivity[],
  used: Set<string>
): ClothingItem | null {
  if (!requirement.category) return null;

  const available = wardrobe.filter(
    (item) => item.category === requirement.category && !used.has(item.id)
  );
  const priorityGroups = [
    available.filter((item) => item.isFavorite === true),
    available.filter((item) => hasActivityTag(item, activities)),
    available.filter(hasNeutralColor),
    available.slice().sort((a, b) => a.usageCount - b.usageCount),
  ];

  for (const group of priorityGroups) {
    const item = group.find((candidate) => !used.has(candidate.id));
    if (item) return item;
  }

  return null;
}

function suggestedType(requirement: PackQuantity): string {
  return requirement.tags[0] ?? requirement.category ?? requirement.label.toLowerCase();
}

function matchWardrobe(
  quantities: PackQuantity[],
  wardrobe: ClothingItem[],
  activities: PackActivity[]
): WardrobeMatch[] {
  const used = new Set<string>();

  return quantities.map((requirement) => {
    const candidates: ClothingItem[] = [];

    for (let slot = 0; slot < requirement.quantity; slot += 1) {
      const item = pickSlotItem(wardrobe, requirement, activities, used);
      if (!item) break;
      used.add(item.id);
      candidates.push(item);
    }

    const missingQuantity = Math.max(0, requirement.quantity - candidates.length);
    const status =
      candidates.length === 0 ? "need to buy" :
      missingQuantity > 0 ? "mixed" :
      "from wardrobe";

    return {
      requirementKey: requirement.key,
      label: requirement.label,
      requiredQuantity: requirement.quantity,
      fromWardrobe: candidates.map(toPackedItem),
      missingQuantity,
      status,
    };
  });
}

function missingItems(matches: WardrobeMatch[], quantities: PackQuantity[]): MissingItem[] {
  return matches
    .filter((match) => match.missingQuantity > 0)
    .map((match) => {
      const quantity = quantities.find((item) => item.key === match.requirementKey);
      return {
        label: match.label,
        quantity: match.missingQuantity,
        reason: quantity?.reason ?? "Not enough wardrobe matches",
        suggestedType: quantity ? suggestedType(quantity) : match.label.toLowerCase(),
      };
    });
}

function itemsForRequirement(matches: WardrobeMatch[], key: string): PackedWardrobeItem[] {
  return matches.find((match) => match.requirementKey === key)?.fromWardrobe ?? [];
}

function rotateItem(items: PackedWardrobeItem[], index: number): PackedWardrobeItem | undefined {
  return items.length > 0 ? items[index % items.length] : undefined;
}

function fallbackPlan(input: PackRequest, days: number, matches: WardrobeMatch[]): DayOutfitPlan[] {
  const tops = [
    ...itemsForRequirement(matches, "tops"),
    ...itemsForRequirement(matches, "formalTops"),
  ];
  const bottoms = itemsForRequirement(matches, "bottoms");
  const shoes = [
    ...itemsForRequirement(matches, "shoes"),
    ...itemsForRequirement(matches, "formalShoes"),
    ...itemsForRequirement(matches, "sandals"),
  ];
  const layers = [
    ...itemsForRequirement(matches, "layers"),
    ...itemsForRequirement(matches, "blazers"),
    ...itemsForRequirement(matches, "technicalLayer"),
  ];
  const formalOutfit = itemsForRequirement(matches, "formalOutfit");
  let previousTopId: string | undefined;

  return Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    let top = rotateItem(tops, index);
    if (top?.id === previousTopId && tops.length > 1) {
      top = rotateItem(tops, index + 1);
    }
    if (top) previousTopId = top.id;

    const bottomIndex = Math.floor(index / 2);
    const shoeIndex = Math.floor(index / 2);
    const items = [
      top,
      rotateItem(bottoms, bottomIndex),
      rotateItem(shoes, shoeIndex),
      rotateItem(layers, index),
    ].filter((item): item is PackedWardrobeItem => Boolean(item));

    if (input.activities.includes("formal event") && day === 1) {
      items.push(...formalOutfit);
    }

    const rewearNote = tops.length > 0 && day === tops.length + 1
      ? " Re-wearing tops starts today."
      : "";
    const eveningNote = input.activities.includes("formal event") && day === 1
      ? " Evening formal outfit included."
      : "";

    return {
      day,
      date: dateForDay(input.tripStartDate, day),
      outfitName: `Day ${day} outfit`,
      items: Array.from(new Set(items.map((item) => item.name))),
      notes: `Bottoms are reworn on alternating days and shoes rotate every 2 days.${eveningNote}${rewearNote}`,
    };
  });
}

async function aiOutfitPlan(
  input: PackRequest,
  days: number,
  matches: WardrobeMatch[]
): Promise<DayOutfitPlan[] | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;

  const matchedItems = matches.flatMap((match) => match.fromWardrobe);
  if (matchedItems.length === 0) return null;

  const groq = new Groq({ apiKey: key });
  const prompt = `Create a ${days}-day packing outfit plan for ${input.destinationCity}.
Trip dates: ${input.tripStartDate} to ${input.tripEndDate}.
Activities: ${input.activities.join(", ")}.
Use ONLY these matched wardrobe item names:
${matchedItems.map((item) => `- ${item.name} (${item.category}, ${item.color}, tags: ${item.tags.join(", ") || "none"})`).join("\n")}

Rules:
- Never repeat the same top on consecutive days.
- Re-wear bottoms on days 2, 4, 6, 8 and so on.
- Rotate shoes every 2 days.
- If activities include formal event, add an evening outfit on day 1 using the formalOutfit slot.
- If trip length exceeds available tops, add a note on the day where re-wearing starts.

Return ONLY valid JSON in this shape:
[
  {"day":1,"date":"YYYY-MM-DD","outfitName":"short name","items":["exact matched item name"],"notes":"one short sentence"}
]`;

  try {
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You create practical travel outfit plans as strict JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 900,
    });
    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) return null;
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<DayOutfitPlan>[];
    if (!Array.isArray(parsed)) return null;

    const allowedNames = new Set(matchedItems.map((item) => item.name));
    const fallback = fallbackPlan(input, days, matches);
    return parsed.slice(0, days).map((day, index) => ({
      day: Number(day.day) || index + 1,
      date: typeof day.date === "string" ? day.date : dateForDay(input.tripStartDate, index + 1),
      outfitName: typeof day.outfitName === "string" ? day.outfitName : `Day ${index + 1} outfit`,
      items: Array.isArray(day.items)
        ? day.items.map(String).filter((item) => allowedNames.has(item))
        : fallback[index]?.items ?? [],
      notes: typeof day.notes === "string" ? day.notes : fallback[index]?.notes ?? "",
    }));
  } catch (error) {
    console.warn("Pack AI plan failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

router.post("/", async (req, res) => {
  const input = req.body as Partial<PackRequest>;
  const activities = uniqueActivities(input.activities);
  const request: PackRequest = {
    destinationCity: String(input.destinationCity ?? "").trim(),
    tripStartDate: String(input.tripStartDate ?? ""),
    tripEndDate: String(input.tripEndDate ?? ""),
    activities,
    wardrobeItems: clientWardrobeItems(input.wardrobeItems, req.auth!.userId) ?? undefined,
  };
  const days = tripDays(request.tripStartDate, request.tripEndDate);

  if (!request.destinationCity || days <= 0 || activities.length === 0) {
    res.status(400).json({ error: "Destination, valid dates, and at least one activity are required." });
    return;
  }

  const wardrobe = request.wardrobeItems ?? repo.getItems(req.auth!.userId);
  const calculatedQuantities = calculateQuantities(request, days);
  const wardrobeMatches = matchWardrobe(calculatedQuantities, wardrobe, request.activities);
  const missing = missingItems(wardrobeMatches, calculatedQuantities);
  const aiPlan = await aiOutfitPlan(request, days, wardrobeMatches);

  const response: PackResponse = {
    tripSummary: {
      days,
      ...(days > 14 || (request.activities.includes("gym") && days > 3) ? { laundryNote: true } : {}),
    },
    calculatedQuantities,
    wardrobeMatches,
    missingItems: missing,
    dayByDayOutfitPlan: aiPlan && aiPlan.length > 0
      ? aiPlan
      : fallbackPlan(request, days, wardrobeMatches),
  };

  res.json(response);
});

export default router;
