# My Wardrobe

Premium wardrobe app with real AI styling, Firebase-ready architecture, and a minimal dark UI.

## For founders — how this app is built

Read **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** first. It explains frontend vs backend, where secrets go, and how data flows.

### Two modes (automatic)

| Mode | You need | Data | Auth |
|------|----------|------|------|
| **Dev (default)** | `server/.env` + `npm run dev:server` | SQLite API | Email or demo Google |
| **Firebase** | `.env.local` with Firebase + Cloudinary vars | Firestore + Cloudinary images | Firebase Auth |

## Quick start

```bash
# Install
npm install
npm install --prefix server

# Server secrets — copy and add your Groq key
cp server/.env.example server/.env

# Terminal 1
npm run dev:server

# Terminal 2
npm run dev
```

Open **http://localhost:5173** → **Continue with Google** for instant demo.

## Real AI (required for stylist)

Add to `server/.env`:

```
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

Or use `OPENAI_API_KEY` instead. Without this, the stylist returns an error (no fake responses).

## Firebase setup

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Authentication** (Email + Google)
3. Create **Firestore** database
4. Copy web config into `.env.local` (see `.env.example`)
5. Deploy rules: `firebase deploy --only firestore:rules` (uses `firestore.rules`)

## Cloudinary image hosting

Wardrobe images are uploaded to Cloudinary with an unsigned upload preset. The returned Cloudinary URL is saved in the existing Firestore `wardrobeItems.imageUrl` field.

Add these to `.env.local`:

```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
VITE_CLOUDINARY_FOLDER=wardrobe
```

`VITE_CLOUDINARY_FOLDER` is optional. If omitted, uploads are stored under `wardrobe/{userId}`.

Public `VITE_*` keys are safe in the frontend. **Never** put `GROQ_API_KEY` in the frontend.

## Project structure

```
src/
  components/ui/     Design system (Button, Card, StatCard)
  pages/             Screens
  context/           Global auth + wardrobe state
  services/          API client, Firebase helpers
  lib/               Firebase init, utils, outfit helpers

server/
  src/routes/        HTTP endpoints
  src/services/ai.ts Real LLM (Groq / OpenAI)
  data/              SQLite (dev mode)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Frontend |
| `npm run dev:server` | API + AI |
| `npm run build` | Production frontend |

## Vercel deployment

- Frontend build command: `npm run build`
- Frontend output directory: `dist`
- Add the Firebase and Cloudinary `VITE_*` values in Vercel project settings.
- Do not add `GROQ_API_KEY`, `OPENAI_API_KEY`, `JWT_SECRET`, or Firebase Admin private keys as `VITE_*` variables.
- If the Express API is deployed separately, set `VITE_API_URL` to that API origin and set server `CORS_ORIGIN` to the Vercel frontend origin.
