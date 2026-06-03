import type { ClothingItem, Outfit, UserProfile } from "../types";
import { api } from "./api";

export async function respondWithAI(
  prompt: string,
  items: ClothingItem[],
  outfits: Outfit[],
  profile?: UserProfile
): Promise<string> {
  try {
    const response = await api.sendChat(prompt, items, outfits, profile);
    return response.reply.content || "I couldn't come up with a response. Try rephrasing your question!";
  } catch (err) {
    console.error("AI stylist request error:", err);
    return "Something went wrong with the AI. Try again in a moment.";
  }
}

// Greeting stays local — no need to waste an API call on this
const GREETINGS = [
  "Hello — I'm your personal stylist. Tell me what the day holds, and I'll dress you accordingly.",
  "Good to see you. What's on the agenda today?",
  "Welcome back. Shall we craft something beautiful?",
];

export function greeting(): string {
  return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
}

// Keep the old sync `respond` as a fallback (used nowhere now, but safe to keep)
export function respond(
  prompt: string,
  items: ClothingItem[],
  outfits: Outfit[]
): string {
  void outfits;
  const q = prompt.toLowerCase().trim();
  if (!q) return "Tell me a bit about the occasion, and I'll take it from there.";
  return `A thoughtful question. With ${items.length} pieces in your wardrobe, I can tailor advice by occasion, color, or season. Try asking "What should I wear to a wedding?" or "What matches black jeans?"`;
}
