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
    mk("White Oxford Shirt", "tops", "White", ["formal", "cotton"], "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80", gender, true),
    mk("Navy Polo Shirt", "tops", "Navy", ["casual", "cotton"], "https://images.unsplash.com/photo-1571455786673-9d9d6c194f90?w=800&q=80", gender),
    mk("Charcoal Blazer", "tops", "Charcoal", ["formal", "blazer"], "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80", gender, true),
    mk("Camel Crewneck Sweater", "tops", "Camel", ["casual", "wool"], "https://images.unsplash.com/photo-1614975058789-41316d0e2e4b?w=800&q=80", gender),
    mk("Black Slim Trousers", "bottoms", "Black", ["formal", "tailored"], "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80", gender),
    mk("Indigo Slim Jeans", "bottoms", "Indigo", ["casual", "denim"], "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80", gender),
    mk("Khaki Chinos", "bottoms", "Khaki", ["casual", "smart-casual"], "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80", gender, true),
    mk("Black Derby Shoes", "shoes", "Black", ["formal", "leather"], "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=800&q=80", gender, true),
    mk("White Leather Sneakers", "shoes", "White", ["casual"], "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80", gender),
    mk("Brown Chelsea Boots", "shoes", "Brown", ["smart-casual", "leather"], "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=800&q=80", gender),
    mk("Leather Belt", "accessories", "Tan", ["leather", "formal"], "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&q=80", gender),
    mk("Classic Watch", "accessories", "Silver", ["formal", "minimal"], "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80", gender),
  ];
}

function buildFemaleSeed(gender: Gender = "female"): SeedWardrobeItem[] {
  return [
    mk("Floral Tie-Neck Blouse", "tops", "Ivory", ["blouse", "formal"], "https://unsplash.com/photos/cMB3D5Ox5KE/download?force=true&w=800", gender, true),
    mk("Black Tailored Blazer", "tops", "Black", ["blazer", "formal"], "https://unsplash.com/photos/0LBFW2KvwvQ/download?force=true&w=800", gender),
    mk("Camel Knit Cardigan", "tops", "Camel", ["knit", "casual"], "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&q=80", gender, true),
    mk("Black Tie-Waist Blouse", "tops", "Black", ["blouse", "minimal"], "https://unsplash.com/photos/GxFw4_pKMN8/download?force=true&w=800", gender),
    mk("Black Wide-Leg Trousers", "bottoms", "Black", ["formal", "tailored"], "https://unsplash.com/photos/GxFw4_pKMN8/download?force=true&w=800", gender),
    mk("High-Waist Straight Jeans", "bottoms", "Indigo", ["denim", "casual"], "https://unsplash.com/photos/uioCcxc8WUc/download?force=true&w=800", gender),
    mk("Cream Midi Skirt", "bottoms", "Cream", ["skirt", "formal"], "https://unsplash.com/photos/wzRhjUeB9Wk/download?force=true&w=800", gender),
    mk("Black Heeled Sandals", "shoes", "Black", ["heels", "formal"], "https://unsplash.com/photos/hhZoxX2mnno/download?force=true&w=800", gender, true),
    mk("White Low-Top Sneakers", "shoes", "White", ["sneakers", "casual"], "https://unsplash.com/photos/Oi01LlirSHk/download?force=true&w=800", gender),
    mk("Gold Hoop Earrings", "accessories", "Gold", ["jewelry"], "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80", gender),
    mk("Black Statement Belt", "accessories", "Black", ["belt", "leather"], "https://unsplash.com/photos/EDvECxZcu6Q/download?force=true&w=800", gender),
    mk("Structured Shoulder Bag", "accessories", "Black", ["handbag", "formal"], "https://unsplash.com/photos/6B8QjOuD2VU/download?force=true&w=800", gender),
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
