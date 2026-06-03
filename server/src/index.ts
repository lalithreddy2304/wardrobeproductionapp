import "dotenv/config";
import express from "express";
import cors from "cors";
import "./db.js";
import authRoutes from "./routes/auth.js";
import itemsRoutes from "./routes/items.js";
import outfitsRoutes from "./routes/outfits.js";
import chatRoutes from "./routes/chat.js";
import discoverRoutes from "./routes/discover.js";
import packRoutes from "./routes/pack.js";
import { isAIConfigured } from "./services/ai.js";

const PORT = Number(process.env.PORT) || 3001;
const app = express();
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(process.env.CORS_ORIGIN ?? process.env.FRONTEND_URL ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

if (!process.env.GROQ_API_KEY) {
  console.warn("WARNING: GROQ_API_KEY not set — AI features will use fallback mode");
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "20mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "my-wardrobe-api",
    ai: isAIConfigured() ? "ready" : "missing_key",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/items", itemsRoutes);
app.use("/api/outfits", outfitsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/discover", discoverRoutes);
app.use("/api/pack", packRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`My Wardrobe API → http://localhost:${PORT}`);
  console.log(`AI: ${isAIConfigured() ? "enabled" : "add GROQ_API_KEY to server/.env"}`);
});
