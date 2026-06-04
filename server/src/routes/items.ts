import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { repo } from "../repository.js";
import type { ClothingItem } from "../types.js";
import { uid } from "../utils.js";

const router = Router();
const CATEGORIES: ClothingItem["category"][] = ["tops", "bottoms", "shoes", "accessories"];
router.use(requireAuth);

router.get("/", (req, res) => {
  const userId = req.auth!.userId;
  const items = repo.getItems(userId);
  res.json({ items });
});

router.post("/", (req, res) => {
  const userId = req.auth!.userId;
  const body = req.body as Partial<ClothingItem>;
  console.info("[wardrobe:api] POST /api/items endpoint called", {
    userId,
    payload: summarizeItemForLog(body),
  });
  if (!body.name || !body.category || !body.color || !body.imageUrl) {
    console.warn("[wardrobe:api] POST /api/items validation failed", {
      userId,
      hasName: Boolean(body.name),
      hasCategory: Boolean(body.category),
      hasColor: Boolean(body.color),
      hasImageUrl: Boolean(body.imageUrl),
    });
    res.status(400).json({ error: "Name, category, color, and image are required." });
    return;
  }
  if (!CATEGORIES.includes(body.category)) {
    console.warn("[wardrobe:api] POST /api/items category validation failed", {
      userId,
      category: body.category,
    });
    res.status(400).json({ error: "Category must be tops, bottoms, shoes, or accessories." });
    return;
  }
  const item: ClothingItem = {
    id: uid("item_"),
    userId,
    name: body.name,
    category: body.category,
    color: body.color,
    tags: Array.isArray(body.tags) ? body.tags : [],
    imageUrl: body.imageUrl,
    usageCount: 0,
    isFavorite: body.isFavorite ?? false,
    createdAt: Date.now(),
  };
  try {
    const result = repo.insertItem(item);
    console.info("[wardrobe:api] Database insert result", {
      userId,
      itemId: item.id,
      changes: result.changes,
      lastInsertRowid: String(result.lastInsertRowid),
    });
    console.info("[wardrobe:api] POST /api/items response body", {
      item: summarizeItemForLog(item),
    });
    res.status(201).json({ item });
  } catch (error) {
    console.error("[wardrobe:api] Database insert failed", {
      userId,
      itemId: item.id,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ error: "Could not save wardrobe item." });
  }
});

router.patch("/:id", (req, res) => {
  const userId = req.auth!.userId;
  const item = repo.updateItem(userId, req.params.id, req.body);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  res.json({ item });
});

router.delete("/:id", (req, res) => {
  const userId = req.auth!.userId;
  if (!repo.deleteItem(userId, req.params.id)) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  res.status(204).end();
});

export default router;

function summarizeItemForLog(item: Partial<ClothingItem>) {
  return {
    id: item.id,
    userId: item.userId,
    name: item.name,
    category: item.category,
    color: item.color,
    tags: Array.isArray(item.tags) ? item.tags : [],
    imageUrl: item.imageUrl
      ? {
          kind: item.imageUrl.startsWith("data:") ? "data-url" : "remote-url",
          length: item.imageUrl.length,
          prefix: item.imageUrl.slice(0, 32),
        }
      : { kind: "empty", length: 0 },
  };
}
