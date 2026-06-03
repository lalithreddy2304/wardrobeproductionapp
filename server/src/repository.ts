import { db } from "./db.js";
import type { ChatMessage, ClothingItem, Outfit, User } from "./types.js";
import { buildSeedWardrobe } from "./seed.js";

type UserRow = {
  id: string;
  email: string;
  display_name: string;
  photo_url: string | null;
  provider: string;
  password_hash: string | null;
  created_at: number;
};

type ItemRow = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  color: string;
  tags: string;
  image_url: string;
  usage_count: number;
  is_favorite: number;
  created_at: number;
};

type OutfitRow = {
  id: string;
  user_id: string;
  name: string;
  items: string;
  occasion: string;
  rating: number;
  is_favorite: number;
  notes: string | null;
  created_at: number;
};

type ChatRow = {
  id: string;
  user_id: string;
  role: string;
  content: string;
  timestamp: number;
};

function rowToUser(r: UserRow): User {
  return {
    id: r.id,
    email: r.email,
    displayName: r.display_name,
    photoURL: r.photo_url ?? undefined,
    provider: r.provider as User["provider"],
  };
}

function rowToItem(r: ItemRow): ClothingItem {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    category: r.category as ClothingItem["category"],
    color: r.color,
    tags: JSON.parse(r.tags) as string[],
    imageUrl: r.image_url,
    usageCount: r.usage_count,
    isFavorite: r.is_favorite === 1,
    createdAt: r.created_at,
  };
}

function rowToOutfit(r: OutfitRow): Outfit {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    items: JSON.parse(r.items),
    occasion: r.occasion as Outfit["occasion"],
    rating: r.rating,
    isFavorite: r.is_favorite === 1,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
  };
}

function rowToChat(r: ChatRow): ChatMessage {
  return {
    id: r.id,
    role: r.role as ChatMessage["role"],
    content: r.content,
    timestamp: r.timestamp,
  };
}

export const repo = {
  findUserByEmail(email: string): (User & { passwordHash: string | null }) | null {
    const row = db
      .prepare("SELECT * FROM users WHERE lower(email) = lower(?)")
      .get(email) as UserRow | undefined;
    if (!row) return null;
    return { ...rowToUser(row), passwordHash: row.password_hash };
  },

  findUserById(id: string): User | null {
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
    return row ? rowToUser(row) : null;
  },

  createUser(user: User, passwordHash: string | null) {
    db.prepare(
      `INSERT INTO users (id, email, display_name, photo_url, provider, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(user.id, user.email, user.displayName, user.photoURL ?? null, user.provider, passwordHash, Date.now());
  },

  deleteUser(userId: string): boolean {
    const result = db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    return result.changes > 0;
  },

  getItems(userId: string): ClothingItem[] {
    const rows = db
      .prepare("SELECT * FROM clothing_items WHERE user_id = ? ORDER BY created_at DESC")
      .all(userId) as ItemRow[];
    return rows.map(rowToItem);
  },

  insertItem(item: ClothingItem) {
    db.prepare(
      `INSERT INTO clothing_items (id, user_id, name, category, color, tags, image_url, usage_count, is_favorite, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      item.id,
      item.userId,
      item.name,
      item.category,
      item.color,
      JSON.stringify(item.tags),
      item.imageUrl,
      item.usageCount,
      item.isFavorite ? 1 : 0,
      item.createdAt
    );
  },

  updateItem(userId: string, id: string, patch: Partial<ClothingItem>): ClothingItem | null {
    const existing = db
      .prepare("SELECT * FROM clothing_items WHERE id = ? AND user_id = ?")
      .get(id, userId) as ItemRow | undefined;
    if (!existing) return null;
    const current = rowToItem(existing);
    const next = { ...current, ...patch };
    db.prepare(
      `UPDATE clothing_items SET name=?, category=?, color=?, tags=?, image_url=?, usage_count=?, is_favorite=? WHERE id=? AND user_id=?`
    ).run(
      next.name,
      next.category,
      next.color,
      JSON.stringify(next.tags),
      next.imageUrl,
      next.usageCount,
      next.isFavorite ? 1 : 0,
      id,
      userId
    );
    return next;
  },

  deleteItem(userId: string, id: string): boolean {
    const r = db.prepare("DELETE FROM clothing_items WHERE id = ? AND user_id = ?").run(id, userId);
    return r.changes > 0;
  },

  seedWardrobeIfEmpty(userId: string): ClothingItem[] {
    const count = db
      .prepare("SELECT COUNT(*) as c FROM clothing_items WHERE user_id = ?")
      .get(userId) as { c: number };
    if (count.c > 0) return repo.getItems(userId);
    const seed = buildSeedWardrobe(userId);
    const insert = db.prepare(
      `INSERT INTO clothing_items (id, user_id, name, category, color, tags, image_url, usage_count, is_favorite, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const tx = db.transaction((items: ClothingItem[]) => {
      for (const item of items) {
        insert.run(
          item.id,
          item.userId,
          item.name,
          item.category,
          item.color,
          JSON.stringify(item.tags),
          item.imageUrl,
          item.usageCount,
          item.isFavorite ? 1 : 0,
          item.createdAt
        );
      }
    });
    tx(seed);
    return seed;
  },

  getOutfits(userId: string): Outfit[] {
    const rows = db
      .prepare("SELECT * FROM outfits WHERE user_id = ? ORDER BY created_at DESC")
      .all(userId) as OutfitRow[];
    return rows.map(rowToOutfit);
  },

  insertOutfit(outfit: Outfit) {
    db.prepare(
      `INSERT INTO outfits (id, user_id, name, items, occasion, rating, is_favorite, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      outfit.id,
      outfit.userId,
      outfit.name,
      JSON.stringify(outfit.items),
      outfit.occasion,
      outfit.rating,
      outfit.isFavorite ? 1 : 0,
      outfit.notes ?? null,
      outfit.createdAt
    );
  },

  updateOutfit(userId: string, id: string, patch: Partial<Outfit>): Outfit | null {
    const existing = db
      .prepare("SELECT * FROM outfits WHERE id = ? AND user_id = ?")
      .get(id, userId) as OutfitRow | undefined;
    if (!existing) return null;
    const current = rowToOutfit(existing);
    const next = { ...current, ...patch };
    db.prepare(
      `UPDATE outfits SET name=?, items=?, occasion=?, rating=?, is_favorite=?, notes=? WHERE id=? AND user_id=?`
    ).run(
      next.name,
      JSON.stringify(next.items),
      next.occasion,
      next.rating,
      next.isFavorite ? 1 : 0,
      next.notes ?? null,
      id,
      userId
    );
    return next;
  },

  deleteOutfit(userId: string, id: string): boolean {
    const r = db.prepare("DELETE FROM outfits WHERE id = ? AND user_id = ?").run(id, userId);
    return r.changes > 0;
  },

  getChat(userId: string): ChatMessage[] {
    const rows = db
      .prepare("SELECT * FROM chat_messages WHERE user_id = ? ORDER BY timestamp ASC")
      .all(userId) as ChatRow[];
    return rows.map(rowToChat);
  },

  addChat(userId: string, msg: ChatMessage) {
    db.prepare(
      `INSERT INTO chat_messages (id, user_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)`
    ).run(msg.id, userId, msg.role, msg.content, msg.timestamp);
    const count = db
      .prepare("SELECT COUNT(*) as c FROM chat_messages WHERE user_id = ?")
      .get(userId) as { c: number };
    if (count.c > 100) {
      db.prepare(
        `DELETE FROM chat_messages WHERE user_id = ? AND id NOT IN (
          SELECT id FROM chat_messages WHERE user_id = ? ORDER BY timestamp DESC LIMIT 100
        )`
      ).run(userId, userId);
    }
  },

  clearChat(userId: string) {
    db.prepare("DELETE FROM chat_messages WHERE user_id = ?").run(userId);
  },
};
