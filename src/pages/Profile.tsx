import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Download,
  Edit3,
  LogOut,
  Palette,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWardrobe } from "../context/WardrobeContext";
import { useUserProfile } from "../hooks/useUserProfile";
import { getFirebaseAuth } from "../lib/firebase";
import { firebaseErrorCode, firebaseErrorMessage, logFirebaseError } from "../lib/firebaseError";
import { api } from "../services/api";
import * as fb from "../services/firebase/wardrobe";
import type { Gender, SkinTone, StyleGoal, UserProfile } from "../types";

const genderLabels: Record<Gender, string> = {
  female: "Women",
  male: "Men",
  nonbinary: "Non-binary",
};

const skinToneLabels: Record<SkinTone, string> = {
  fair: "Fair",
  light: "Light",
  medium: "Medium",
  "medium-deep": "Medium Deep",
  deep: "Deep",
};

const skinToneColors: Record<SkinTone, string> = {
  fair: "#F5E6D3",
  light: "#E8C9A0",
  medium: "#C68642",
  "medium-deep": "#8D5524",
  deep: "#4A2912",
};

const styleGoalLabels: Record<StyleGoal, string> = {
  "build-wardrobe": "Building wardrobe",
  "daily-outfits": "Daily outfits",
  "shop-smarter": "Shop smarter",
};

const palettes: Record<SkinTone, Array<{ label: string; color: string }>> = {
  fair: [
    { label: "Navy", color: "#172554" },
    { label: "Burgundy", color: "#7F1D1D" },
    { label: "Emerald", color: "#047857" },
    { label: "Dusty Rose", color: "#C58A91" },
    { label: "Ivory", color: "#F8F1DF" },
  ],
  light: [
    { label: "Camel", color: "#C19A6B" },
    { label: "Coral", color: "#FF7F6E" },
    { label: "Olive", color: "#697A3A" },
    { label: "Warm White", color: "#F7EEDC" },
    { label: "Dusty Pink", color: "#D8A3A7" },
  ],
  medium: [
    { label: "Rust", color: "#B45309" },
    { label: "Forest Green", color: "#14532D" },
    { label: "Burgundy", color: "#7F1D1D" },
    { label: "Gold", color: "#D4AF37" },
    { label: "Warm Camel", color: "#B68B5D" },
  ],
  "medium-deep": [
    { label: "Jewel tones", color: "#4C1D95" },
    { label: "Gold", color: "#D4AF37" },
    { label: "Burnt Orange", color: "#C2410C" },
    { label: "Deep Teal", color: "#115E59" },
    { label: "Plum", color: "#581C87" },
  ],
  deep: [
    { label: "Bright White", color: "#FFFFFF" },
    { label: "Gold", color: "#D4AF37" },
    { label: "Royal Blue", color: "#1D4ED8" },
    { label: "Emerald", color: "#047857" },
    { label: "Hot Pink", color: "#DB2777" },
  ],
};

const fallbackProfile: UserProfile = {
  gender: "female",
  skinTone: "medium",
  styleGoal: "build-wardrobe",
  onboardingComplete: true,
};

export function Profile() {
  const navigate = useNavigate();
  const { user, signOut, updateDisplayName, clearAuthState } = useAuth();
  const { items, outfits } = useWardrobe();
  const { saveProfile } = useUserProfile();
  const [chatCount, setChatCount] = useState(0);
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [styleModalOpen, setStyleModalOpen] = useState(false);
  const [notifications, setNotifications] = useState(
    () => localStorage.getItem("profile_outfit_suggestions") !== "off"
  );
  const [status, setStatus] = useState<string | null>(null);

  const profile = user?.profile ?? fallbackProfile;
  const [draftGender, setDraftGender] = useState<Gender>(profile.gender);
  const [draftSkinTone, setDraftSkinTone] = useState<SkinTone>(profile.skinTone);

  useEffect(() => {
    if (!user) return;
    fb.fetchChat(user.id).then((messages) => setChatCount(messages.length)).catch(() => setChatCount(0));
  }, [user]);

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
  }, [user?.displayName]);

  useEffect(() => {
    localStorage.setItem("profile_outfit_suggestions", notifications ? "on" : "off");
  }, [notifications]);

  const summary = useMemo(() => buildWardrobeSummary(items), [items]);
  const memberSince = user?.createdAt
    ? new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(user.createdAt))
    : "Recently";

  const saveDisplayName = async () => {
    const nextName = displayName.trim();
    if (!nextName) return;
    await updateDisplayName(nextName);
    setEditingName(false);
  };

  const saveStyleIdentity = async () => {
    await saveProfile({
      ...profile,
      gender: draftGender,
      skinTone: draftSkinTone,
      onboardingComplete: true,
    });
    setStyleModalOpen(false);
  };

  const exportWardrobe = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "wardrobe-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const clearChatHistory = async () => {
    if (!user || !window.confirm("Clear all AI conversation history?")) return;
    await fb.clearChat(user.id);
    setChatCount(0);
    setStatus("Chat history cleared.");
  };

  const reauthenticateForDeletion = async (currentUser: FirebaseUser) => {
    const providerIds = currentUser.providerData.map((provider) => provider.providerId);

    if (providerIds.includes("password")) {
      const email = currentUser.email;
      if (!email) throw new Error("auth/missing-email: Cannot reauthenticate this account.");
      const password = window.prompt("Please enter your password to delete your account.");
      if (!password) throw new Error("auth/requires-recent-login: Password is required to delete your account.");
      await reauthenticateWithCredential(
        currentUser,
        EmailAuthProvider.credential(email, password)
      );
      return;
    }

    if (providerIds.includes("google.com")) {
      await reauthenticateWithPopup(currentUser, new GoogleAuthProvider());
      return;
    }

    throw new Error("auth/requires-recent-login: Please sign in again before deleting your account.");
  };

  const deleteCurrentAccount = async (currentUser: FirebaseUser) => {
    await fb.deleteUserFirestoreData(currentUser.uid);
    await api.deleteMe();
    await deleteUser(currentUser);
  };

  const finishDeletedSession = async () => {
    const firebaseAuth = getFirebaseAuth();
    await firebaseSignOut(firebaseAuth).catch((error) => {
      logFirebaseError("Firebase sign-out after account deletion failed", error);
    });
    localStorage.clear();
    sessionStorage.clear();
    clearAuthState();
    navigate("/login", { replace: true });
  };

  const deleteAccount = async () => {
    if (!user) return;
    const confirmed = window.confirm("This will permanently delete your wardrobe and account");
    if (!confirmed) return;

    try {
      const currentUser = getFirebaseAuth().currentUser;
      if (!currentUser) throw new Error("No active Firebase user.");

      try {
        await deleteCurrentAccount(currentUser);
      } catch (error) {
        if (firebaseErrorCode(error) !== "auth/requires-recent-login") {
          throw error;
        }
        setStatus("Please sign in again to finish deleting your account.");
        await reauthenticateForDeletion(currentUser);
        const refreshedUser = getFirebaseAuth().currentUser;
        if (!refreshedUser) throw new Error("No active Firebase user after reauthentication.");
        await deleteCurrentAccount(refreshedUser);
      }

      await finishDeletedSession();
    } catch (error) {
      logFirebaseError("Account deletion failed", error);
      setStatus(`Could not delete account: ${firebaseErrorMessage(error, "Unknown error")}`);
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-[1200px] space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)]"
      >
        <div className="absolute inset-0 aurora-bg opacity-70" />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <Avatar name={user.displayName} photoURL={user.photoURL} size="large" />
            <div className="min-w-0 flex-1">
              {editingName ? (
                <div className="flex max-w-md gap-2">
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="h-11 flex-1 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-4 text-sm focus-gold"
                  />
                  <button onClick={saveDisplayName} className="h-11 rounded-full bg-[color:var(--color-gold)] px-5 text-sm font-medium text-[color:var(--color-bg)]">
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-serif text-4xl leading-none text-[color:var(--color-ink)] md:text-5xl">
                    {user.displayName}
                  </h1>
                  <button
                    onClick={() => setEditingName(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--color-border)] text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-gold)]/50"
                    aria-label="Edit display name"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>
              )}
              <p className="mt-2 text-sm text-[color:var(--color-ink-muted)]">{user.email}</p>
              <p className="mt-1 text-xs text-[color:var(--color-ink-dim)]">Member since {memberSince}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <HeaderStat value={items.length} label="Pieces in wardrobe" />
            <HeaderStat value={outfits.length} label="Outfits saved" />
            <HeaderStat value={chatCount} label="AI conversations" />
          </div>
        </div>
      </motion.section>

      <AnimatedSection title="Your style identity">
        <div className="rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Chip>{genderLabels[profile.gender]}</Chip>
                <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-3 py-1 text-xs text-[color:var(--color-ink)]">
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: skinToneColors[profile.skinTone] }} />
                  {skinToneLabels[profile.skinTone]}
                </span>
                <Chip>{styleGoalLabels[profile.styleGoal]}</Chip>
              </div>
              <p className="text-sm text-[color:var(--color-ink-muted)]">
                Your recommendations tune color, silhouette, and shopping advice around these details.
              </p>
            </div>
            <button
              onClick={() => {
                setDraftGender(profile.gender);
                setDraftSkinTone(profile.skinTone);
                setStyleModalOpen(true);
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[color:var(--color-border)] px-4 text-sm text-[color:var(--color-ink)] hover:border-[color:var(--color-gold)]/50"
            >
              <Edit3 className="h-4 w-4" />
              Edit
            </button>
          </div>

          <div className="mt-7">
            <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-dim)]">
              Recommended palette
            </p>
            <div className="grid gap-4 sm:grid-cols-5">
              {palettes[profile.skinTone].map((color) => (
                <div key={color.label} className="flex items-center gap-3 sm:block">
                  <span
                    className="block h-12 w-12 rounded-full border border-white/10 sm:mb-2"
                    style={{ backgroundColor: color.color }}
                  />
                  <span className="text-xs text-[color:var(--color-ink-muted)]">{color.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection title="Your wardrobe at a glance">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SmallStat label="Dominant color" value={summary.dominantColor} icon={Palette} />
          <SmallStat label="Most worn item" value={summary.mostWornItem} icon={ChevronRight} />
          <SmallStat label="Wardrobe health" value={`${summary.healthScore}/100`} icon={Shield} />
          <SmallStat label="Combinations" value={summary.combinations} icon={ChevronRight} />
        </div>
        {items.length === 0 && (
          <p className="mt-4 text-sm text-[color:var(--color-ink-muted)]">
            Add clothes to see your score
          </p>
        )}
      </AnimatedSection>

      <AnimatedSection title="Account">
        <div className="overflow-hidden rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)]">
          <SettingsButton label="Edit display name" detail={user.displayName} onClick={() => setEditingName(true)} />
          <SettingsRow label="Outfit suggestions" detail="Notifications">
            <button
              onClick={() => setNotifications((current) => !current)}
              className={`relative h-7 w-12 rounded-full transition-colors ${notifications ? "bg-[color:var(--color-gold)]" : "bg-[color:var(--color-border)]"}`}
              aria-label="Toggle outfit suggestions"
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-[color:var(--color-bg)] transition-transform ${notifications ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </SettingsRow>
          <SettingsRow label="Dark mode" detail="App uses dark mode by default">
            <span className="rounded-full border border-[color:var(--color-border)] px-3 py-1 text-xs text-[color:var(--color-ink-muted)]">On</span>
          </SettingsRow>
        </div>
      </AnimatedSection>

      <AnimatedSection title="Data">
        <div className="overflow-hidden rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)]">
          <SettingsButton label="Export wardrobe" detail="Download JSON" onClick={exportWardrobe} icon={Download} />
          <SettingsButton label="Clear chat history" detail={`${chatCount} messages`} onClick={clearChatHistory} icon={Trash2} />
        </div>
      </AnimatedSection>

      <AnimatedSection title="Danger zone">
        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={signOut} className="flex h-12 items-center justify-center gap-2 rounded-full border border-[color:var(--color-border)] text-sm text-[color:var(--color-ink)] hover:border-[color:var(--color-gold)]/50">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
          <button onClick={deleteAccount} className="flex h-12 items-center justify-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 text-sm text-red-200 hover:bg-red-500/15">
            <Trash2 className="h-4 w-4" />
            Delete account
          </button>
        </div>
        {status && <p className="mt-3 text-sm text-[color:var(--color-ink-muted)]">{status}</p>}
      </AnimatedSection>

      <footer className="border-t border-[color:var(--color-border-soft)] py-8 text-sm text-[color:var(--color-ink-muted)]">
        <p className="font-serif text-xl text-[color:var(--color-ink)]">My Wardrobe</p>
        <p className="mt-1">Version 1.0.0</p>
        <p className="mt-1">Built with Itten Color Theory + French Capsule Method</p>
        <div className="mt-3 flex gap-4 text-xs">
          <a href="#" className="hover:text-[color:var(--color-gold)]">Privacy Policy</a>
          <a href="#" className="hover:text-[color:var(--color-gold)]">Terms</a>
        </div>
      </footer>

      {styleModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-serif text-3xl">Edit style identity</h2>
              <button onClick={() => setStyleModalOpen(false)} className="h-9 w-9 rounded-full hover:bg-[color:var(--color-bg-elev)]" aria-label="Close">
                <X className="mx-auto h-4 w-4" />
              </button>
            </div>

            <p className="mb-3 text-sm text-[color:var(--color-ink-muted)]">Gender</p>
            <div className="mb-6 flex flex-wrap gap-2">
              {(Object.keys(genderLabels) as Gender[]).map((gender) => (
                <button
                  key={gender}
                  onClick={() => setDraftGender(gender)}
                  className={`rounded-full border px-4 py-2 text-sm ${draftGender === gender ? "border-[color:var(--color-gold)] bg-[color:var(--color-gold)]/10 text-[color:var(--color-ink)]" : "border-[color:var(--color-border)] text-[color:var(--color-ink-muted)]"}`}
                >
                  {genderLabels[gender]}
                </button>
              ))}
            </div>

            <p className="mb-3 text-sm text-[color:var(--color-ink-muted)]">Skin tone</p>
            <div className="mb-8 flex flex-wrap gap-3">
              {(Object.keys(skinToneLabels) as SkinTone[]).map((tone) => (
                <button
                  key={tone}
                  onClick={() => setDraftSkinTone(tone)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${draftSkinTone === tone ? "border-[color:var(--color-gold)] bg-[color:var(--color-gold)]/10" : "border-[color:var(--color-border)]"}`}
                >
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: skinToneColors[tone] }} />
                  {skinToneLabels[tone]}
                </button>
              ))}
            </div>

            <button onClick={saveStyleIdentity} className="h-11 w-full rounded-full bg-[color:var(--color-gold)] text-sm font-medium text-[color:var(--color-bg)]">
              Save changes
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function buildWardrobeSummary(items: ReturnType<typeof useWardrobe>["items"]) {
  if (items.length === 0) {
    return {
      dominantColor: "None yet",
      mostWornItem: "None yet",
      healthScore: 0,
      combinations: 0,
    };
  }

  const colors = new Map<string, number>();
  for (const item of items) colors.set(item.color, (colors.get(item.color) ?? 0) + 1);
  const dominantColor = [...colors.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "None yet";
  const mostWornItem = [...items].sort((a, b) => b.usageCount - a.usageCount)[0]?.name ?? "None yet";
  const categoryCount = new Set(items.map((item) => item.category)).size;
  const colorDiversity = colors.size;
  const totalWears = items.reduce((sum, item) => sum + item.usageCount, 0);
  const healthScore = Math.min(
    100,
    Math.round(categoryCount * 18 + Math.min(colorDiversity, 8) * 4 + Math.min(totalWears, 30))
  );
  const tops = items.filter((item) => item.category === "tops").length;
  const bottoms = items.filter((item) => item.category === "bottoms").length;
  const shoes = items.filter((item) => item.category === "shoes").length;
  const accessories = items.filter((item) => item.category === "accessories").length;
  const combinations = tops * bottoms * Math.max(shoes, 1) + Math.max(accessories, 0);

  return { dominantColor, mostWornItem, healthScore, combinations };
}

function Avatar({ name, photoURL, size }: { name: string; photoURL?: string; size: "small" | "large" }) {
  const dimension = size === "large" ? "h-24 w-24 text-4xl" : "h-10 w-10 text-base";
  if (photoURL) {
    return <img src={photoURL} alt="" className={`${dimension} rounded-full object-cover`} />;
  }

  return (
    <div className={`${dimension} flex shrink-0 items-center justify-center rounded-full bg-[color:var(--color-bg-elev)] text-[color:var(--color-gold)] ring-1 ring-[color:var(--color-border)]`}>
      <span className="font-serif leading-none">{name[0]?.toUpperCase() ?? "U"}</span>
    </div>
  );
}

function AnimatedSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}>
      <h2 className="mb-4 font-serif text-3xl text-[color:var(--color-ink)]">{title}</h2>
      {children}
    </motion.section>
  );
}

function HeaderStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="font-serif text-3xl text-[color:var(--color-ink)]">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-widest text-[color:var(--color-ink-muted)]">{label}</p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-3 py-1 text-xs text-[color:var(--color-ink)]">
      {children}
    </span>
  );
}

function SmallStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-5">
      <Icon className="h-4 w-4 text-[color:var(--color-gold)]" />
      <p className="mt-4 truncate font-serif text-2xl text-[color:var(--color-ink)]">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-widest text-[color:var(--color-ink-muted)]">{label}</p>
    </div>
  );
}

function SettingsRow({
  label,
  detail,
  children,
}: {
  label: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 border-b border-[color:var(--color-border-soft)] px-5 py-3 last:border-b-0">
      <div>
        <p className="text-sm text-[color:var(--color-ink)]">{label}</p>
        <p className="text-xs text-[color:var(--color-ink-muted)]">{detail}</p>
      </div>
      {children}
    </div>
  );
}

function SettingsButton({
  label,
  detail,
  onClick,
  icon: Icon = ChevronRight,
}: {
  label: string;
  detail: string;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-14 w-full items-center justify-between gap-4 border-b border-[color:var(--color-border-soft)] px-5 py-3 text-left last:border-b-0 hover:bg-[color:var(--color-bg-elev)]/50"
    >
      <span>
        <span className="block text-sm text-[color:var(--color-ink)]">{label}</span>
        <span className="block text-xs text-[color:var(--color-ink-muted)]">{detail}</span>
      </span>
      <Icon className="h-4 w-4 text-[color:var(--color-ink-dim)]" />
    </button>
  );
}
