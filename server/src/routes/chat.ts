import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { repo } from "../repository.js";
import { greeting, isAIConfigured, stylistReply, type AIProfile } from "../services/ai.js";
import type { ChatMessage, ClothingItem, Outfit } from "../types.js";
import { uid } from "../utils.js";

const router = Router();
router.use(requireAuth);
router.use((req, _res, next) => {
  try {
    const result = repo.ensureUserForAuth(req.auth!);
    req.auth = { userId: result.user.id, email: result.user.email };
  } catch (error) {
    console.warn("[chat:user-sync] could not ensure user before chat request:", error);
  }
  next();
});

function getChatSafely(userId: string): ChatMessage[] {
  try {
    return repo.getChat(userId);
  } catch (error) {
    console.warn("[chat] could not read chat history:", error);
    return [];
  }
}

function addChatSafely(userId: string, message: ChatMessage) {
  try {
    repo.addChat(userId, message);
  } catch (error) {
    console.warn("[chat] could not save chat message:", {
      userId,
      messageId: message.id,
      role: message.role,
      error,
    });
  }
}

router.get("/", (req, res) => {
  const userId = req.auth!.userId;
  let messages = getChatSafely(userId);
  if (messages.length === 0) {
    const welcome: ChatMessage = {
      id: uid("m_"),
      role: "assistant",
      content: greeting(),
      timestamp: Date.now(),
    };
    addChatSafely(userId, welcome);
    messages = [welcome];
  }
  res.json({ messages, aiEnabled: isAIConfigured() });
});

router.post("/", async (req, res) => {
  const userId = req.auth!.userId;
  const { content, items: bodyItems, outfits: bodyOutfits, profile } = req.body as {
    content?: string;
    items?: ClothingItem[];
    outfits?: Outfit[];
    profile?: AIProfile;
  };
  if (!content?.trim()) {
    res.status(400).json({ error: "Message content is required." });
    return;
  }

  const userMsg: ChatMessage = {
    id: uid("m_"),
    role: "user",
    content: content.trim(),
    timestamp: Date.now(),
  };
  addChatSafely(userId, userMsg);

  const items = Array.isArray(bodyItems) ? bodyItems : repo.getItems(userId);
  const outfits = Array.isArray(bodyOutfits) ? bodyOutfits : repo.getOutfits(userId);
  const history = getChatSafely(userId).slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let replyContent: string;
  try {
    if (!isAIConfigured()) {
      res.status(503).json({
        error: "AI not configured. Add GROQ_API_KEY or OPENAI_API_KEY to server/.env",
      });
      return;
    }
    replyContent = await stylistReply(userMsg.content, items, outfits, history, profile);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI request failed";
    res.status(502).json({ error: msg });
    return;
  }

  const reply: ChatMessage = {
    id: uid("m_"),
    role: "assistant",
    content: replyContent,
    timestamp: Date.now(),
  };
  addChatSafely(userId, reply);
  res.json({ userMessage: userMsg, reply });
});

router.delete("/", (req, res) => {
  const userId = req.auth!.userId;
  try {
    repo.clearChat(userId);
  } catch (error) {
    console.warn("[chat] could not clear chat history:", error);
  }
  const welcome: ChatMessage = {
    id: uid("m_"),
    role: "assistant",
    content: greeting(),
    timestamp: Date.now(),
  };
  addChatSafely(userId, welcome);
  res.json({ messages: [welcome] });
});

export default router;
