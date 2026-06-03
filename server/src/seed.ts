import type { ClothingItem } from "./types.js";
import { uid } from "./utils.js";

export function buildSeedWardrobe(userId: string): ClothingItem[] {
  const now = Date.now();
  const mk = (
    i: number,
    name: string,
    category: ClothingItem["category"],
    color: string,
    tags: string[],
    imageUrl: string,
    usageCount: number
  ): ClothingItem => ({
    id: uid("item_"),
    userId,
    name,
    category,
    color,
    tags,
    imageUrl,
    usageCount,
    createdAt: now - i * 1000 * 60 * 60,
    isFavorite: usageCount > 8,
  });

  return [
    mk(1, "Ivory Silk Blouse", "tops", "Ivory", ["silk", "formal", "date"], "https://images.unsplash.com/photo-1551232864-3f0890e580d9?w=800&q=80", 14),
    mk(2, "Charcoal Wool Blazer", "tops", "Charcoal", ["blazer", "formal", "wool", "office"], "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80", 11),
    mk(3, "Camel Cashmere Sweater", "tops", "Camel", ["cashmere", "cozy", "winter", "office"], "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&q=80", 18),
    mk(4, "Navy Silk Shirt", "tops", "Navy", ["silk", "smart", "party", "date"], "https://images.unsplash.com/photo-1602810316693-3667c854239a?w=800&q=80", 7),
    mk(5, "Black Turtleneck", "tops", "Black", ["winter", "minimal"], "https://images.unsplash.com/photo-1564584217132-2271feaeb3c5?w=800&q=80", 22),
    mk(6, "Cream Linen Tee", "tops", "Cream", ["summer", "linen", "casual"], "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80", 9),
    mk(7, "Black Tailored Trousers", "bottoms", "Black", ["formal", "wool", "office"], "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80", 16),
    mk(8, "Mid-wash Straight Jeans", "bottoms", "Indigo", ["denim", "casual", "travel"], "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80", 13),
    mk(9, "Cream Pleated Skirt", "bottoms", "Cream", ["feminine", "formal", "wedding", "date"], "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&q=80", 4),
    mk(10, "Chocolate Wide-leg Pants", "bottoms", "Chocolate", ["trendy", "casual"], "https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?w=800&q=80", 6),
    mk(11, "Beige Chinos", "bottoms", "Beige", ["casual", "cotton", "office", "travel"], "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80", 8),
    mk(12, "Black Leather Loafers", "shoes", "Black", ["leather", "formal"], "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800&q=80", 20),
    mk(13, "White Minimalist Sneakers", "shoes", "White", ["casual", "minimal", "party", "travel"], "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80", 17),
    mk(14, "Tan Suede Boots", "shoes", "Tan", ["suede", "autumn", "office"], "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800&q=80", 5),
    mk(15, "Nude Heels", "shoes", "Nude", ["formal", "wedding"], "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=80", 3),
    mk(16, "Gold Hoop Earrings", "accessories", "Gold", ["jewelry", "classic", "party", "date", "wedding"], "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80", 12),
    mk(17, "Tan Leather Belt", "accessories", "Tan", ["leather", "classic"], "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&q=80", 10),
    mk(18, "Black Structured Handbag", "accessories", "Black", ["leather", "formal"], "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80", 15),
    mk(19, "Silk Scarf — Navy", "accessories", "Navy", ["silk", "accent"], "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&q=80", 2),
    mk(20, "Cat-eye Sunglasses", "accessories", "Black", ["summer", "trendy"], "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80", 6),
  ];
}
