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
    mk("White Oxford Shirt", "tops", "White", ["formal", "cotton", "office", "wedding"], "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80", gender, true),
    mk("Navy Polo Shirt", "tops", "Navy", ["casual", "cotton", "travel"], "https://images.unsplash.com/photo-1571455786673-9d9d6c194f90?w=800&q=80", gender),
    mk("Charcoal Blazer", "tops", "Charcoal", ["formal", "blazer", "wedding", "office"], "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80", gender, true),
    mk("Camel Crewneck Sweater", "tops", "Camel", ["casual", "wool", "office", "date"], "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&q=80", gender),
    mk("Black Slim Trousers", "bottoms", "Black", ["formal", "tailored", "wedding", "office"], "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80", gender),
    mk("Indigo Slim Jeans", "bottoms", "Indigo", ["casual", "denim", "travel"], "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80", gender),
    mk("Khaki Chinos", "bottoms", "Khaki", ["casual", "smart-casual", "office", "travel"], "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80", gender, true),
    mk("Black Derby Shoes", "shoes", "Black", ["formal", "leather", "wedding"], "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=800&q=80", gender, true),
    mk("White Leather Sneakers", "shoes", "White", ["casual", "party", "travel"], "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80", gender),
    mk("Brown Chelsea Boots", "shoes", "Brown", ["smart-casual", "leather", "office", "date"], "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=800&q=80", gender),
    mk("Leather Belt", "accessories", "Tan", ["leather", "formal", "office"], "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&q=80", gender),
    mk("Classic Watch", "accessories", "Silver", ["formal", "minimal", "wedding", "office", "date"], "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80", gender),
  ];
}

function buildFemaleSeed(gender: Gender = "female"): SeedWardrobeItem[] {
  return [
    mk("Floral Tie-Neck Blouse", "tops", "Ivory", ["blouse", "formal", "date"], "https://images.unsplash.com/photo-1551232864-3f0890e580d9?w=800&q=80", gender, true),
    mk("Black Tailored Blazer", "tops", "Black", ["blazer", "formal", "office"], "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80", gender),
    mk("Camel Knit Cardigan", "tops", "Camel", ["knit", "casual"], "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&q=80", gender, true),
    mk("Black Tie-Waist Blouse", "tops", "Black", ["blouse", "minimal", "date"], "https://images.unsplash.com/photo-1564584217132-2271feaeb3c5?w=800&q=80", gender),
    mk("Black Wide-Leg Trousers", "bottoms", "Black", ["formal", "tailored", "office"], "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80", gender),
    mk("High-Waist Straight Jeans", "bottoms", "Indigo", ["denim", "casual", "travel"], "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80", gender),
    mk("Cream Midi Skirt", "bottoms", "Cream", ["skirt", "formal", "wedding"], "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&q=80", gender),
    mk("Black Heeled Sandals", "shoes", "Black", ["heels", "formal", "wedding"], "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=80", gender, true),
    mk("White Low-Top Sneakers", "shoes", "White", ["sneakers", "casual", "travel"], "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80", gender),
    mk("Gold Hoop Earrings", "accessories", "Gold", ["jewelry"], "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80", gender),
    mk("Black Statement Belt", "accessories", "Black", ["belt", "leather"], "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&q=80", gender),
    mk("Structured Shoulder Bag", "accessories", "Black", ["handbag", "formal"], "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80", gender),
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
