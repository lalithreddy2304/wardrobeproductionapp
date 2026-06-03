import type { Outfit, OutfitItemRef } from "../types";
import { uid } from "./utils";

export type OutfitMode = Outfit["occasion"];

export function createOutfitRecord(
  userId: string,
  name: string,
  refs: OutfitItemRef[],
  mode: OutfitMode,
  notes: string
): Outfit {
  return {
    id: uid("outfit_"),
    userId,
    name,
    items: refs,
    occasion: mode,
    rating: 0,
    isFavorite: false,
    createdAt: Date.now(),
    notes,
  };
}
