# Firebase Setup — Step by Step

## What Firebase gives you

| Service | Purpose in My Wardrobe |
|---------|------------------------|
| **Auth** | Login with email or Google |
| **Firestore** | Database for clothes, outfits, chat |

Wardrobe images are hosted by Cloudinary. Firebase Storage is not used.

## 1. Create project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. **Add project** → name it `my-wardrobe`
3. Disable Analytics if you want (optional)

## 2. Register web app

1. Project overview → **Web** icon (`</>`)
2. App nickname: `My Wardrobe Web`
3. Copy the `firebaseConfig` object into `.env.local`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...
VITE_CLOUDINARY_FOLDER=wardrobe
```

These are **public** — that's normal. Security = Firestore rules + Auth.

## 3. Enable Authentication

1. Build → **Authentication** → Get started
2. Enable **Email/Password**
3. Enable **Google** (add support email)

## 4. Create Firestore

1. Build → **Firestore Database** → Create
2. Start in **test mode** for dev (then deploy `firestore.rules` from project root)
3. Create composite indexes if prompted (userId + createdAt)

## 5. Configure Cloudinary uploads

1. In Cloudinary, create or choose a cloud.
2. Create an unsigned image upload preset.
3. Add `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET` to `.env.local`.
4. Optionally set `VITE_CLOUDINARY_FOLDER`; otherwise uploads use `wardrobe/{userId}`.

## 6. Deploy security rules

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select existing project, use firestore.rules
firebase deploy --only firestore:rules
```

## Collections (auto-created on use)

- `wardrobeItems` — each doc has `userId`
- `outfits` — saved looks
- `aiHistory` — chat messages
- `users` — optional profile docs

## AI still needs Express

Firestore handles your closet. **Groq/OpenAI keys stay on the server** (`server/.env`). After Firebase login, the app calls `/api/auth/sync` to get a JWT for AI routes only.
