import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { repo } from "../repository.js";
import { generateOutfitNotes, isAIConfigured, type AIProfile } from "../services/ai.js";
import { generateOutfit, type OutfitMode } from "../services/outfitGenerator.js";
import type { ClothingItem, Outfit } from "../types.js";
import { uid } from "../utils.js";

const router = Router();
router.use(requireAuth);

const recentGeneratedOutfits = new Map<string, string[]>();

function outfitSignature(outfit: ReturnType<typeof generateOutfit>): string {
  return outfit.items
    .map((item) => item.itemId)
    .sort()
    .join("|");
}

function rememberGeneratedOutfit(userId: string, signature: string) {
  const recent = recentGeneratedOutfits.get(userId) ?? [];
  recentGeneratedOutfits.set(userId, [signature, ...recent].slice(0, 3));
}

router.get("/", (req, res) => {
  res.json({ outfits: repo.getOutfits(req.auth!.userId) });
});

router.post("/generate", async (req, res) => {
  const userId = req.auth!.userId;
  const mode = (req.body?.mode ?? "random") as OutfitMode;
  const bodyItems = req.body?.items as ClothingItem[] | undefined;
  const profile = req.body?.profile as AIProfile | undefined;
  const items = Array.isArray(bodyItems)
    ? bodyItems
    : repo.getItems(userId);
  if (items.length < 3) {
    res.status(400).json({ error: "Add at least a top, bottom, and shoes to generate an outfit" });
    return;
  }

  const recent = recentGeneratedOutfits.get(userId) ?? [];
  let generated = generateOutfit(items, mode, userId);
  let signature = outfitSignature(generated);

  for (let retry = 0; retry < 3 && recent.includes(signature); retry += 1) {
    generated = generateOutfit(items, mode, userId);
    signature = outfitSignature(generated);
  }

  rememberGeneratedOutfit(userId, signature);

  if (isAIConfigured()) {
    try {
      const names = generated.items
        .map((r) => items.find((i) => i.id === r.itemId)?.name)
        .filter(Boolean) as string[];
      const aiNote = await generateOutfitNotes(
        mode,
        names,
        [],
        generated.score,
        generated.violations,
        generated.colorReason,
        profile
      );
      generated.notes = aiNote;
    } catch {
      /* keep algorithmic notes */
    }
  }

  res.json(generated);
});

router.post("/", (req, res) => {
  const userId = req.auth!.userId;
  const body = req.body as Partial<Outfit>;
  if (!body.name || !body.items?.length) {
    res.status(400).json({ error: "Outfit name and items are required." });
    return;
  }
  const outfit: Outfit = {
    id: body.id ?? uid("outfit_"),
    userId,
    name: body.name,
    items: body.items,
    occasion: body.occasion ?? "random",
    rating: body.rating ?? 0,
    isFavorite: body.isFavorite ?? false,
    createdAt: body.createdAt ?? Date.now(),
    notes: body.notes,
  };
  repo.insertOutfit(outfit);
  res.status(201).json({ outfit });
});

router.patch("/:id", (req, res) => {
  const outfit = repo.updateOutfit(req.auth!.userId, req.params.id, req.body);
  if (!outfit) {
    res.status(404).json({ error: "Outfit not found" });
    return;
  }
  res.json({ outfit });
});

router.delete("/:id", (req, res) => {
  if (!repo.deleteOutfit(req.auth!.userId, req.params.id)) {
    res.status(404).json({ error: "Outfit not found" });
    return;
  }
  res.status(204).end();
});

export default router;
