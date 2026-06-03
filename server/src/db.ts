import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "wardrobe.db");
export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    photo_url TEXT,
    provider TEXT NOT NULL,
    password_hash TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS clothing_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    color TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    image_url TEXT NOT NULL,
    usage_count INTEGER NOT NULL DEFAULT 0,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS outfits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    items TEXT NOT NULL DEFAULT '[]',
    occasion TEXT NOT NULL,
    rating REAL NOT NULL DEFAULT 0,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_items_user ON clothing_items(user_id);
  CREATE INDEX IF NOT EXISTS idx_outfits_user ON outfits(user_id);
  CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id);
`);
