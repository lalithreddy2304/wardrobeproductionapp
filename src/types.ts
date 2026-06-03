export type Category = "tops" | "bottoms" | "shoes" | "accessories";

export type Gender = "male" | "female" | "nonbinary";

export type SkinTone =
  | "fair"
  | "light"
  | "medium"
  | "medium-deep"
  | "deep";

export type StyleGoal =
  | "build-wardrobe"
  | "daily-outfits"
  | "shop-smarter";

export type UserProfile = {
  gender: Gender;
  skinTone: SkinTone;
  styleGoal: StyleGoal;
  onboardingComplete: boolean;
  usedDemoWardrobe?: boolean;
};

export type ClothingItem = {
  id: string;
  userId: string;
  name: string;
  category: Category;
  color: string;
  tags: string[];
  imageUrl: string; // data URL or remote URL
  usageCount: number;
  createdAt: number;
  isFavorite?: boolean;
  gender?: Gender;
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
  rating: number; // 0-5
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
  profile?: UserProfile;
  createdAt?: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

export type PackActivity =
  | "business"
  | "beach"
  | "hiking"
  | "casual"
  | "formal event"
  | "gym";

export type PackRequest = {
  destinationCity: string;
  tripStartDate: string;
  tripEndDate: string;
  activities: PackActivity[];
  wardrobeItems?: ClothingItem[];
};

export type PackQuantity = {
  key: string;
  label: string;
  quantity: number;
  category?: Category;
  tags: string[];
  reason: string;
};

export type PackedWardrobeItem = {
  id: string;
  wardrobeItemId: string;
  name: string;
  category: Category;
  color: string;
  tags: string[];
  imageUrl: string;
  fromWardrobe: true;
};

export type WardrobeMatch = {
  requirementKey: string;
  label: string;
  requiredQuantity: number;
  fromWardrobe: PackedWardrobeItem[];
  missingQuantity: number;
  status: "from wardrobe" | "need to buy" | "mixed";
};

export type MissingItem = {
  label: string;
  quantity: number;
  reason: string;
  suggestedType: string;
};

export type DayOutfitPlan = {
  day: number;
  date: string;
  outfitName: string;
  items: string[];
  notes: string;
};

export type PackResponse = {
  calculatedQuantities: PackQuantity[];
  wardrobeMatches: WardrobeMatch[];
  missingItems: MissingItem[];
  dayByDayOutfitPlan: DayOutfitPlan[];
};
