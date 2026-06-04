# My Wardrobe — Architecture Guide

*Written for founders learning engineering while building.*

## The big picture

```
┌──────────────────────────────────────────────────────────────┐
│  BROWSER (React + Vite)                                      │
│  • Pages & components — what users see                       │
│  • Contexts — auth + wardrobe state                          │
│  • data layer — Firebase OR REST API (auto-selected)         │
└───────────────┬──────────────────────────────┬───────────────┘
                │                              │
                ▼                              ▼
     ┌────────────────────┐         ┌─────────────────────┐
     │ Firebase           │         │ Express API (server)│
     │ • Auth             │         │ • AI only (secrets) │
     │ • Firestore        │         │ • GROQ / OPENAI     │
     └────────────────────┘         └─────────────────────┘
                │
                ▼
     ┌────────────────────┐
     │ Cloudinary         │
     │ • Wardrobe images  │
     │ • URL saved in     │
     │   imageUrl         │
     └────────────────────┘
```

## Why you need a backend for AI

| What | Where it lives | Why |
|------|----------------|-----|
| UI, routing | Frontend | Fast, interactive |
| Login (Firebase) | Frontend + Firebase | Google handles passwords |
| Wardrobe data | Firestore or SQLite API | Persistent database |
| Wardrobe images | Cloudinary | Hosted image URLs stored in `imageUrl` |
| **OpenAI / Groq key** | **Server only** | If exposed in frontend, anyone can steal it and charge your card |

**Rule:** Anything that costs money or must stay secret → server `.env`, never `VITE_*`.

## Public vs private environment variables

### Safe in frontend (`VITE_*` — bundled into the app)

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- etc.

Firebase **expects** these in the client. Security comes from **Firestore Security Rules**, not hiding the API key.

### Must stay on server only

- `GROQ_API_KEY` or `OPENAI_API_KEY`
- `JWT_SECRET` (if using Express auth)

## Folder map

```
src/
  pages/          → One file per screen (Dashboard, Wardrobe, …)
  components/
    ui/           → Reusable buttons, cards, headers (design system)
    layout/       → Sidebar, TopBar, Layout
  context/        → AuthContext, WardrobeContext (global state)
  services/
    api.ts        → HTTP client for Express
    data/         → Picks Firebase or API automatically
    firebase/     → Firestore helpers
    cloudinary.ts → Cloudinary image upload helper
  lib/
    firebase.ts   → Firebase app init

server/
  src/routes/     → HTTP endpoints
  src/services/
    ai.ts         → Real LLM calls (Groq/OpenAI)
  data/           → SQLite file (dev fallback when Firebase off)
```

## Data flow examples

### Sign in (Firebase mode)

1. User clicks "Continue with Google"
2. `AuthContext` → `signInWithPopup(auth, googleProvider)`
3. Firebase returns user + ID token
4. `onAuthStateChanged` updates React state
5. `WardrobeContext` loads items from Firestore `wardrobeItems` where `userId == uid`

### Add wardrobe item

1. User selects a JPG, PNG, or WebP image in `UploadModal`
2. Client validates file type and size
3. `services/cloudinary.ts` uploads the image to Cloudinary
4. Cloudinary returns a hosted URL
5. Firestore stores wardrobe metadata in `wardrobeItems`, including the same `imageUrl` field

### Ask the stylist (always via server)

1. User types in Stylist page
2. Frontend → `POST /api/chat` with message + JWT or Firebase token
3. Server builds prompt with wardrobe summary
4. Server calls Groq with `GROQ_API_KEY`
5. Server saves reply to DB/Firestore, returns to UI

## Firestore collections

| Collection | Document ID | Key fields |
|------------|---------------|------------|
| `users` | Firebase `uid` | email, displayName, photoURL |
| `wardrobeItems` | auto | userId, name, category, color, imageUrl, tags |
| `outfits` | auto | userId, name, items[], occasion |
| `aiHistory` | per chat session or message | userId, role, content, timestamp |

## Which stack when?

| Mode | When | Command |
|------|------|---------|
| **Dev (API)** | No Firebase keys yet | `npm run dev:server` + `npm run dev` |
| **Production (Firebase)** | Keys in `.env` | Deploy frontend + Firebase rules + AI server |
