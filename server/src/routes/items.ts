import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { repo } from "../repository.js";
import type { ClothingItem } from "../types.js";
import { uid } from "../utils.js";

const router = Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  const userId = req.auth!.userId;
  const items = repo.getItems(userId);
  res.json({ items });
});

router.post("/", (req, res) => {
  const userId = req.auth!.userId;
  const body = req.body as Partial<ClothingItem>;
  if (!body.name || !body.category || !body.color || !body.imageUrl) {
    res.status(400).json({ error: "Name, category, color, and image are required." });
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
  repo.insertItem(item);
  res.status(201).json({ item });
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
