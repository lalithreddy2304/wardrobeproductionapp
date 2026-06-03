export type Category = "tops" | "bottoms" | "shoes" | "accessories";

export type ClothingItem = {
  id: string;
  userId: string;
  name: string;
  category: Category;
  color: string;
  tags: string[];
  imageUrl: string;
  usageCount: number;
  createdAt: number;
  isFavorite?: boolean;
};

export type OutfitItemRef = {
  itemId: string;
  role: "top" | "bottom" | "shoes" | "accessory";
};

export type Outfit = {
  id: string;
  userId: string;
  name: string;
  items: OutfitItemRef[];
  occasion: "random" | "casual" | "formal" | "party" | "wedding";
  rating: number;
  isFavorite: boolean;
  createdAt: number;
  notes?: string;
};

export type User = {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  provider: "google" | "password";
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};
