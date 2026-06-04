import type { ClothingItem, Gender } from "../types";

type SeedWardrobeItem = Omit<
  ClothingItem,
  "id" | "userId" | "createdAt" | "usageCount"
>;

function mk(
  name: string,
  category: ClothingItem["category"],
  color: string,
  tags: string[],
  imageUrl: string,
  gender: Gender,
  isFavorite?: boolean
): SeedWardrobeItem {
  return { name, category, color, tags, imageUrl, gender, isFavorite: !!isFavorite };
}

function buildMaleSeed(gender: Gender = "male"): SeedWardrobeItem[] {
  return [
    mk("White T-Shirt",          "tops", "White",    ["casual", "cotton", "party", "travel"],
       "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80", gender, true),
    mk("Navy Polo Shirt",        "tops", "Navy",     ["casual", "cotton", "travel", "smart-casual"],
       "https://images.unsplash.com/photo-1571455786673-9d9d6c194f90?w=800&q=80", gender),
    mk("Charcoal Blazer",        "tops", "Charcoal", ["formal", "blazer", "wedding", "office", "party"],
       "https://images.unsplash.com/photo-1731586263008-5657796fa016?w=800&q=80", gender, true),
    mk("Camel Crewneck Sweater", "tops", "Camel",    ["casual", "wool", "office", "date", "smart-casual"],
       "https://images.unsplash.com/photo-1670080589800-6416c8ce8a14?w=800&q=80", gender),
    mk("Black Slim Trousers",    "bottoms", "Black", ["formal", "tailored", "wedding", "office", "party"],
       "https://images.unsplash.com/photo-1718252540511-e958742e4165?w=800&q=80", gender),
    mk("Indigo Slim Jeans",      "bottoms", "Indigo",["casual", "denim", "travel", "party"],
       "https://plus.unsplash.com/premium_photo-1674828601362-afb73c907ebe?w=800&q=80", gender),
    mk("Khaki Chinos",           "bottoms", "Khaki", ["casual", "smart-casual", "office", "travel", "date"],
       "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80", gender, true),
    mk("Black Derby Shoes",      "shoes", "Black",   ["formal", "leather", "wedding", "office"],
       "https://images.unsplash.com/photo-1703053026570-f06f3b09a78c?w=800&q=80", gender, true),
    mk("White Leather Sneakers", "shoes", "White",   ["casual", "party", "travel"],
       "https://images.unsplash.com/photo-1608379743498-ac08f6d022ba?w=800&q=80", gender),
    mk("Brown Chelsea Boots",    "shoes", "Brown",   ["smart-casual", "leather", "office", "date", "party"],
       "https://images.unsplash.com/photo-1608629601270-a0007becead3?w=800&q=80", gender),
    mk("Leather Belt",           "accessories", "Tan",    ["leather", "formal", "office", "casual"],
       "https://images.unsplash.com/photo-1664286074176-5206ee5dc878?w=800&q=80", gender),
    mk("Classic Watch",          "accessories", "Silver", ["formal", "minimal", "wedding", "office", "date", "party"],
       "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=800&q=80", gender),
  ];
}

function buildFemaleSeed(gender: Gender = "female"): SeedWardrobeItem[] {
  return [
    mk("Floral Tie-Neck Blouse",   "tops", "Ivory",  ["blouse", "formal", "date", "wedding", "party"],
       "https://images.unsplash.com/photo-1763559053411-80ae3727443e?w=800&q=80", gender, true),
    mk("Black Tailored Blazer",    "tops", "Black",  ["blazer", "formal", "office", "party"],
       "https://plus.unsplash.com/premium_photo-1675186049297-035b3f692c04?w=800&q=80", gender),
    mk("Camel Knit Cardigan",      "tops", "Camel",  ["knit", "casual", "travel", "smart-casual"],
       "https://images.unsplash.com/photo-1631541909061-71e349d1f203?w=800&q=80", gender, true),
    mk("Black Tie-Waist Blouse",   "tops", "Black",  ["blouse", "minimal", "date", "office", "smart-casual"],
       "https://images.unsplash.com/photo-1680506728771-bc497dfe033a?w=800&q=80", gender),
    mk("Black Wide-Leg Trousers",  "bottoms", "Black",["formal", "tailored", "office", "party"],
       "https://images.unsplash.com/photo-1767631338127-8cd80ee2f9df?w=800&q=80", gender),
    mk("High-Waist Straight Jeans","bottoms", "Indigo",["denim", "casual", "travel", "date"],
       "https://images.unsplash.com/photo-1546635834-78554e816d55?w=800&q=80", gender),
    mk("Cream Midi Skirt",         "bottoms", "Cream",["skirt", "formal", "wedding", "date", "feminine"],
       "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&q=80", gender),
    mk("Black Heeled Sandals",     "shoes", "Black",  ["heels", "formal", "wedding", "party", "date"],
       "https://images.unsplash.com/photo-1584473457417-bd0afe798ae1?w=800&q=80", gender, true),
    mk("White Low-Top Sneakers",   "shoes", "White",  ["sneakers", "casual", "travel", "smart-casual"],
       "https://images.unsplash.com/photo-1608379743498-ac08f6d022ba?w=800&q=80", gender),
    mk("Gold Hoop Earrings",       "accessories", "Gold",  ["jewelry", "party", "wedding", "date", "casual"],
       "https://images.unsplash.com/photo-1632525230528-ec17c49bc168?w=800&q=80", gender),
    mk("Black Statement Belt",     "accessories", "Black", ["belt", "leather", "formal", "office", "party"],
       "https://images.unsplash.com/photo-1608461864721-b8f50c91c147?w=800&q=80", gender),
    mk("Structured Shoulder Bag",  "accessories", "Black", ["handbag", "formal", "office", "wedding", "date"],
       "https://images.unsplash.com/photo-1606522754091-a3bbf9ad4cb3?w=800&q=80", gender),
  ];
}

/** Starter wardrobe for new users (Firebase or API seed) */
export function buildSeedWardrobe(
  userId: string,
  gender: Gender
): SeedWardrobeItem[] {
  console.log("buildSeedWardrobe received gender:", gender);
  void userId;

  if (gender === "male") {
    return buildMaleSeed("male");
  }

  if (gender === "nonbinary") {
    const male = buildMaleSeed("nonbinary");
    const female = buildFemaleSeed("nonbinary");

    return [
      male[0],
      male[2],
      male[3],
      male[5],
      male[6],
      male[8],
      female[2],
      female[3],
      female[5],
      female[7],
      female[10],
      female[11],
    ];
  }

  if (gender !== "female") {
    console.warn("Cannot build seed wardrobe without a confirmed gender:", gender);
    return [];
  }

  return buildFemaleSeed("female");
}