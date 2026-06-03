import { Router, type Request } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  analyzeClothingImage,
  analyzeWardrobeCompatibility,
  isAIConfigured,
  type AIProfile,
} from "../services/ai.js";

const router = Router();
router.use(requireAuth);

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("AI request timed out")), ms);
    promise
      .then(resolve, reject)
      .finally(() => clearTimeout(timer));
  });
}

function parseMultipartBody(req: Request): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("error", reject);
    req.on("end", () => {
      const contentType = req.headers["content-type"] ?? "";
      const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
      const boundary = boundaryMatch?.[1] ?? boundaryMatch?.[2];
      if (!boundary) {
        reject(new Error("Missing multipart boundary"));
        return;
      }

      const raw = Buffer.concat(chunks).toString("binary");
      const fields: Record<string, string> = {};
      for (const part of raw.split(`--${boundary}`)) {
        if (!part.includes("Content-Disposition")) continue;
        const name = /name="([^"]+)"/.exec(part)?.[1];
        if (!name) continue;

        const headerEnd = part.indexOf("\r\n\r\n");
        if (headerEnd === -1) continue;
        let value = part.slice(headerEnd + 4).replace(/\r\n--$/, "").replace(/\r\n$/, "");

        if (/filename="[^"]*"/.test(part)) {
          const mimeType = /Content-Type:\s*([^\r\n]+)/i.exec(part)?.[1]?.trim();
          fields.mimeType = mimeType ?? fields.mimeType ?? "image/jpeg";
          value = Buffer.from(value, "binary").toString("base64");
        }

        fields[name] = value;
      }

      resolve(fields);
    });
  });
}

router.post("/analyze", async (req, res) => {
  try {
    const isMultipart = req.is("multipart/form-data");
    const body = isMultipart ? await parseMultipartBody(req) : req.body;
    const imageBase64 = (body?.imageBase64 ?? body?.image) as string | undefined;
    const mimeType = (body?.mimeType as string | undefined) ?? "image/jpeg";
    const parsedPrice = body?.price !== undefined && body.price !== "" ? Number(body.price) : undefined;
    const price = Number.isFinite(parsedPrice) ? parsedPrice : undefined;
    const itemsRaw = body?.items;
    const profile = body?.profile as AIProfile | undefined;
    const items = Array.isArray(itemsRaw)
      ? itemsRaw
      : typeof itemsRaw === "string"
        ? JSON.parse(itemsRaw)
        : undefined;

    if (!imageBase64) {
      res.status(400).json({ error: "Image is required." });
      return;
    }

    if (!Array.isArray(items)) {
      res.status(400).json({ error: "Wardrobe items are required." });
      return;
    }

    if (items.length === 0) {
      res.status(400).json({ error: "Add wardrobe items before analyzing a purchase." });
      return;
    }

    if (!isAIConfigured() || !process.env.GROQ_API_KEY) {
      res.status(503).json({
        error: "Vision analysis needs GROQ_API_KEY. Please describe the item manually for now.",
      });
      return;
    }

    const detectedItem = await withTimeout(
      analyzeClothingImage(imageBase64, mimeType, items, profile),
      12000
    );
    const compatibility = await withTimeout(
      analyzeWardrobeCompatibility(detectedItem, items, price, profile),
      12000
    );

    res.json({ detectedItem, compatibility });
  } catch (error) {
    console.warn(
      "Smart Buy analysis failed:",
      error instanceof Error ? error.message : error
    );
    res.status(500).json({
      error: "I couldn't analyze that photo. Try another image or describe the item manually.",
    });
  }
});

export default router;
