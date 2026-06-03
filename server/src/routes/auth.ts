import { Router } from "express";
import bcrypt from "bcryptjs";
import { repo } from "../repository.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import type { User } from "../types.js";
import { uid } from "../utils.js";
import { verifyFirebaseToken } from "../lib/firebaseAdmin.js";

const router = Router();

router.post("/register", async (req, res) => {
  const { email, password, displayName } = req.body as {
    email?: string;
    password?: string;
    displayName?: string;
  };
  if (!email?.trim() || !password || !displayName?.trim()) {
    res.status(400).json({ error: "Please fill in every field." });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters." });
    return;
  }
  if (repo.findUserByEmail(email)) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }
  const user: User = {
    id: uid("u_"),
    email: email.trim(),
    displayName: displayName.trim(),
    photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`,
    provider: "password",
  };
  const hash = await bcrypt.hash(password, 10);
  repo.createUser(user, hash);
  const token = signToken({ userId: user.id, email: user.email });
  res.status(201).json({ user, token });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }
  const found = repo.findUserByEmail(email);
  if (!found || found.provider !== "password") {
    res.status(401).json({ error: "No account found with that email." });
    return;
  }
  if (!found.passwordHash) {
    res.status(401).json({ error: "Incorrect password." });
    return;
  }
  const ok = await bcrypt.compare(password, found.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Incorrect password." });
    return;
  }
  const { passwordHash: _, ...user } = found;
  const token = signToken({ userId: user.id, email: user.email });
  res.json({ user, token });
});

router.post("/google", (req, res) => {
  const googleEmail = "you@gmail.com";
  let found = repo.findUserByEmail(googleEmail);
  if (!found) {
    const user: User = {
      id: uid("u_"),
      email: googleEmail,
      displayName: "Alex Laurent",
      photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=AlexLaurent",
      provider: "google",
    };
    repo.createUser(user, null);
    found = { ...user, passwordHash: null };
  }
  const { passwordHash: _, ...user } = found;
  const token = signToken({ userId: user.id, email: user.email });
  res.json({ user, token });
});

/** Firebase users call this after sign-in to get a JWT for AI API routes */
router.post("/sync", async (req, res) => {
  const { firebaseToken } = req.body as { firebaseToken?: string };

  if (!firebaseToken) {
    res.status(400).json({ error: "Firebase token is required" });
    return;
  }

  try {
    const { uid: userId, email } = await verifyFirebaseToken(firebaseToken);

    let found = repo.findUserById(userId);
    if (!found) {
      const staleEmailUser = repo.findUserByEmail(email);
      if (staleEmailUser && staleEmailUser.id !== userId) {
        repo.deleteUser(staleEmailUser.id);
      }

      const user: User = {
        id: userId,
        email,
        displayName: email.split("@")[0] || "User",
        provider: "google",
      };
      repo.createUser(user, null);
      found = user;
    }

    const token = signToken({ userId: found.id, email: found.email });
    res.json({ token });
  } catch (error) {
    console.warn("Firebase auth sync failed:", error instanceof Error ? error.message : error);
    res.status(401).json({ error: "Invalid Firebase session" });
  }
});

router.get("/me", requireAuth, (req, res) => {
  const user = repo.findUserById(req.auth!.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user });
});

router.delete("/me", requireAuth, (req, res) => {
  repo.deleteUser(req.auth!.userId);
  res.status(204).end();
});

export default router;
