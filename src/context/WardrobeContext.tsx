import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { doc, getDoc } from "firebase/firestore";
import type { ClothingItem, Gender, Outfit, UserProfile } from "../types";
import { api } from "../services/api";
import { useAuth } from "./AuthContext";
import { isFirebaseConfigured } from "../lib/config";
import * as fb from "../services/firebase/wardrobe";
import { buildSeedWardrobe } from "../services/seedData";
import { getFirebaseDb } from "../lib/firebase";
import { isDataUrl, uploadWardrobeImage } from "../services/cloudinary";

type WardrobeCtx = {
  items: ClothingItem[];
  outfits: Outfit[];
  loading: boolean;
  error: string | null;
  addItem: (item: Omit<ClothingItem, "id" | "userId" | "createdAt" | "usageCount">) => Promise<void>;
  updateItem: (id: string, patch: Partial<ClothingItem>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  toggleFavoriteItem: (id: string) => Promise<void>;
  incrementUsage: (id: string) => Promise<void>;
  addOutfit: (o: Outfit) => Promise<void>;
  updateOutfit: (id: string, patch: Partial<Outfit>) => Promise<void>;
  removeOutfit: (id: string) => Promise<void>;
  toggleFavoriteOutfit: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<WardrobeCtx | null>(null);
const PROFILE_RECHECK_MS = 1000;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isGender(value: unknown): value is Gender {
  return value === "male" || value === "female" || value === "nonbinary";
}

async function readUserProfile(userId: string): Promise<Partial<UserProfile> | null> {
  const snap = await getDoc(doc(getFirebaseDb(), "users", userId));
  return snap.exists() ? (snap.data() as Partial<UserProfile>) : null;
}

async function readConfirmedProfile(userId: string): Promise<UserProfile | null> {
  try {
    const first = await readUserProfile(userId);
    if (isGender(first?.gender)) return first as UserProfile;
  } catch (error) {
    console.warn(
      "Could not read wardrobe profile before seeding:",
      error instanceof Error ? error.message : error
    );
  }

  await wait(PROFILE_RECHECK_MS);

  try {
    const second = await readUserProfile(userId);
    if (isGender(second?.gender)) return second as UserProfile;
  } catch (error) {
    console.warn(
      "Could not re-check wardrobe profile before seeding:",
      error instanceof Error ? error.message : error
    );
  }

  console.warn("Delaying starter wardrobe seeding until gender is confirmed.");
  return null;
}

export function WardrobeProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, needsOnboarding } = useAuth();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const useFirebase = isFirebaseConfigured();

  const load = useCallback(async () => {
    if (!user || needsOnboarding) {
      setItems([]);
      setOutfits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const confirmedProfile = await readConfirmedProfile(user.id);
      const confirmedGender = confirmedProfile?.gender;

      if (!confirmedGender) {
        setItems([]);
        if (useFirebase) {
          setOutfits(await fb.fetchOutfits(user.id));
        } else {
          const { outfits } = await api.getOutfits();
          setOutfits(outfits);
        }
        return;
      }

      const shouldUseDemoWardrobe = confirmedProfile.usedDemoWardrobe === true;

      if (useFirebase) {
        const loaded = await fb.fetchItems(user.id, confirmedGender);
        if (loaded.length > 0) {
          setItems(loaded);
        } else if (shouldUseDemoWardrobe) {
          const seed = buildSeedWardrobe(user.id, confirmedGender);
          setItems(await fb.seedItemsIfEmpty(user.id, seed, confirmedGender));
        } else {
          setItems([]);
        }
        setOutfits(await fb.fetchOutfits(user.id));
      } else {
        const [itemsRes, outfitsRes] = await Promise.all([api.getItems(), api.getOutfits()]);
        if (itemsRes.items.length > 0) {
          setItems(itemsRes.items);
        } else if (shouldUseDemoWardrobe) {
          const seed = buildSeedWardrobe(user.id, confirmedGender);
          const created = await Promise.all(seed.map((item) => api.createItem(item)));
          setItems(created.map(({ item }) => item));
        } else {
          setItems([]);
        }
        setOutfits(outfitsRes.outfits);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load wardrobe");
    } finally {
      setLoading(false);
    }
  }, [user, needsOnboarding, useFirebase]);

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [authLoading, load]);

  const ctx = useMemo<WardrobeCtx>(() => ({
    items,
    outfits,
    loading,
    error,
    refresh: load,

    addItem: async (input) => {
      console.info("[wardrobe:save] WardrobeContext.addItem called", {
        mode: useFirebase ? "firebase" : "api",
        hasUser: Boolean(user),
        currentItemCount: items.length,
        payload: summarizeItemForLog(input),
      });
      if (!user) {
        console.warn("[wardrobe:save] Save aborted because no authenticated user was available");
        return;
      }
      if (useFirebase) {
        const item = await fb.createItem(user.id, input);
        setItems((p) => {
          const next = [item, ...p];
          console.info("[wardrobe:save] Frontend state update result", {
            mode: "firebase",
            beforeCount: p.length,
            afterCount: next.length,
            createdItemId: item.id,
          });
          return next;
        });
        await load();
        console.info("[wardrobe:save] State refresh requested after Firebase insert", {
          createdItemId: item.id,
        });
      } else {
        const imageUrl = isDataUrl(input.imageUrl)
          ? await uploadWardrobeImage(input.imageUrl, user.id)
          : input.imageUrl;
        const { item } = await api.createItem({ ...input, imageUrl });
        setItems((p) => {
          const next = [item, ...p];
          console.info("[wardrobe:save] Frontend state update result", {
            mode: "api",
            beforeCount: p.length,
            afterCount: next.length,
            createdItemId: item.id,
          });
          return next;
        });
        await load();
        console.info("[wardrobe:save] State refresh requested after API insert", {
          createdItemId: item.id,
        });
      }
    },

    updateItem: async (id, patch) => {
      if (!user) return;
      if (useFirebase) {
        await fb.patchItem(user.id, id, patch);
        setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));
      } else {
        const { item } = await api.updateItem(id, patch);
        setItems((p) => p.map((i) => (i.id === id ? item : i)));
      }
    },

    removeItem: async (id) => {
      if (!user) return;
      if (useFirebase) await fb.removeItem(user.id, id);
      else await api.deleteItem(id);
      setItems((p) => p.filter((i) => i.id !== id));
    },

    toggleFavoriteItem: async (id) => {
      const item = items.find((i) => i.id === id);
      if (!item || !user) return;
      const patch = { isFavorite: !item.isFavorite };
      if (useFirebase) {
        await fb.patchItem(user.id, id, patch);
        setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));
      } else {
        const { item: updated } = await api.updateItem(id, patch);
        setItems((p) => p.map((i) => (i.id === id ? updated : i)));
      }
    },

    incrementUsage: async (id) => {
      const item = items.find((i) => i.id === id);
      if (!item || !user) return;
      const patch = { usageCount: (item.usageCount || 0) + 1 };
      if (useFirebase) {
        await fb.patchItem(user.id, id, patch);
        setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));
      } else {
        const { item: updated } = await api.updateItem(id, patch);
        setItems((p) => p.map((i) => (i.id === id ? updated : i)));
      }
    },

    addOutfit: async (o) => {
      if (useFirebase) {
        const outfit = await fb.createOutfit(o);
        setOutfits((p) => [outfit, ...p]);
      } else {
        const { outfit } = await api.createOutfit(o);
        setOutfits((p) => [outfit, ...p]);
      }
    },

    updateOutfit: async (id, patch) => {
      if (useFirebase) {
        await fb.patchOutfit(id, patch);
        setOutfits((p) => p.map((o) => (o.id === id ? { ...o, ...patch } : o)));
      } else {
        const { outfit } = await api.updateOutfit(id, patch);
        setOutfits((p) => p.map((o) => (o.id === id ? outfit : o)));
      }
    },

    removeOutfit: async (id) => {
      if (useFirebase) await fb.removeOutfit(id);
      else await api.deleteOutfit(id);
      setOutfits((p) => p.filter((o) => o.id !== id));
    },

    toggleFavoriteOutfit: async (id) => {
      const outfit = outfits.find((o) => o.id === id);
      if (!outfit) return;
      const patch = { isFavorite: !outfit.isFavorite };
      if (useFirebase) {
        await fb.patchOutfit(id, patch);
        setOutfits((p) => p.map((o) => (o.id === id ? { ...o, ...patch } : o)));
      } else {
        const { outfit: updated } = await api.updateOutfit(id, patch);
        setOutfits((p) => p.map((o) => (o.id === id ? updated : o)));
      }
    },
  }), [items, outfits, loading, error, user, useFirebase, load]);

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}

export function useWardrobe() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWardrobe must be used within WardrobeProvider");
  return c;
}

function summarizeItemForLog(
  item: Omit<ClothingItem, "id" | "userId" | "createdAt" | "usageCount">
) {
  return {
    name: item.name,
    category: item.category,
    color: item.color,
    tags: item.tags,
    isFavorite: item.isFavorite ?? false,
    imageUrl: item.imageUrl
      ? {
          kind: item.imageUrl.startsWith("data:") ? "data-url" : "remote-url",
          length: item.imageUrl.length,
          prefix: item.imageUrl.slice(0, 32),
        }
      : { kind: "empty", length: 0 },
  };
}
