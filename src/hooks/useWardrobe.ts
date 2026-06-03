import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { ClothingItem } from "../types";

type NewWardrobeItem = Omit<ClothingItem, "id" | "userId" | "createdAt" | "usageCount">;
type WardrobeItemPatch = Partial<Omit<ClothingItem, "id" | "userId">>;

function toWardrobeItem(id: string, data: DocumentData): ClothingItem {
  return {
    id,
    userId: data.userId,
    name: data.name,
    category: data.category,
    color: data.color,
    tags: data.tags ?? [],
    imageUrl: data.imageUrl,
    usageCount: data.usageCount ?? 0,
    createdAt: data.createdAt?.toMillis?.() ?? data.createdAt ?? Date.now(),
    isFavorite: data.isFavorite ?? false,
  };
}

async function getUserOwnedItemRef(userId: string, itemId: string) {
  const itemQuery = query(
    collection(db, "wardrobeItems"),
    where("userId", "==", userId),
    where(documentId(), "==", itemId)
  );
  const snapshot = await getDocs(itemQuery);
  const itemDoc = snapshot.docs[0];

  if (!itemDoc) {
    throw new Error("Wardrobe item was not found for this user");
  }

  return doc(db, "wardrobeItems", itemDoc.id);
}

export function useWardrobe(userId?: string) {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const wardrobeQuery = query(
      collection(db, "wardrobeItems"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      wardrobeQuery,
      (snapshot) => {
        setItems(snapshot.docs.map((itemDoc) => toWardrobeItem(itemDoc.id, itemDoc.data())));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  function withUserId(action: string): string {
    if (!userId) throw new Error(`A userId is required to ${action} wardrobe items`);
    return userId;
  }

  const addItem = async (item: NewWardrobeItem): Promise<void> => {
    const uid = withUserId("create");
    await addDoc(collection(db, "wardrobeItems"), {
      ...item,
      userId: uid,
      usageCount: 0,
      createdAt: serverTimestamp(),
    });
  };

  const updateItem = async (itemId: string, patch: WardrobeItemPatch): Promise<void> => {
    const uid = withUserId("update");
    const itemRef = await getUserOwnedItemRef(uid, itemId);
    await updateDoc(itemRef, patch);
  };

  const deleteItem = async (itemId: string): Promise<void> => {
    const uid = withUserId("delete");
    const itemRef = await getUserOwnedItemRef(uid, itemId);
    await deleteDoc(itemRef);
  };

  const incrementUsage = async (itemId: string): Promise<void> => {
    const uid = withUserId("update");
    const itemRef = await getUserOwnedItemRef(uid, itemId);
    await updateDoc(itemRef, { usageCount: increment(1) });
  };

  return { items, loading, error, addItem, updateItem, deleteItem, incrementUsage };
}