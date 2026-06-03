import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { getFirebaseDb, getFirebaseStorage } from "../../lib/firebase";
import type { ClothingItem, Outfit, ChatMessage, Gender } from "../../types";
import { uid } from "../../lib/utils";

const COL = {
  items: "wardrobeItems",
  outfits: "outfits",
  chat: "aiHistory",
  users: "users",
} as const;

const MALE_SEED_ITEM_NAMES = new Set([
  "White Oxford Shirt",
  "Navy Polo Shirt",
  "Charcoal Blazer",
  "Camel Crewneck Sweater",
  "Black Slim Trousers",
  "Indigo Slim Jeans",
  "Khaki Chinos",
  "Black Derby Shoes",
  "White Leather Sneakers",
  "Brown Chelsea Boots",
  "Leather Belt",
  "Classic Watch",
]);

function docToItem(id: string, d: DocumentData, userId: string): ClothingItem {
  return {
    id,
    userId,
    name: d.name,
    category: d.category,
    color: d.color,
    tags: d.tags ?? [],
    imageUrl: d.imageUrl,
    usageCount: d.usageCount ?? 0,
    isFavorite: !!d.isFavorite,
    createdAt: d.createdAt ?? Date.now(),
    gender: d.gender,
  };
}

function docToOutfit(id: string, d: DocumentData, userId: string): Outfit {
  return {
    id,
    userId,
    name: d.name,
    items: d.items ?? [],
    occasion: d.occasion ?? "random",
    rating: d.rating ?? 0,
    isFavorite: !!d.isFavorite,
    createdAt: d.createdAt ?? Date.now(),
    notes: d.notes,
  };
}

export async function fetchItems(
  userId: string,
  gender?: Gender
): Promise<ClothingItem[]> {
  const baseQuery = query(
    collection(getFirebaseDb(), COL.items),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  if (!gender || gender === "nonbinary") {
    const snap = await getDocs(baseQuery);
    return snap.docs.map((d) => docToItem(d.id, d.data(), userId));
  }

  const genderQuery = query(
    collection(getFirebaseDb(), COL.items),
    where("userId", "==", userId),
    where("gender", "==", gender),
    orderBy("createdAt", "desc")
  );

  const [genderSnap, legacySnap] = await Promise.all([
    getDocs(genderQuery),
    getDocs(baseQuery),
  ]);
  const genderItems = genderSnap.docs.map((d) => docToItem(d.id, d.data(), userId));
  const legacyItems = legacySnap.docs
    .filter((d) => {
      const data = d.data();
      return (
        data.gender === undefined &&
        (gender !== "female" || !MALE_SEED_ITEM_NAMES.has(data.name))
      );
    })
    .map((d) => docToItem(d.id, d.data(), userId));

  return [...genderItems, ...legacyItems].sort((a, b) => b.createdAt - a.createdAt);
}

export async function createItem(
  userId: string,
  input: Omit<ClothingItem, "id" | "userId" | "createdAt" | "usageCount">
): Promise<ClothingItem> {
  let imageUrl = input.imageUrl;
  if (imageUrl.startsWith("data:")) {
    const path = `users/${userId}/items/${uid("img_")}.jpg`;
    const storageRef = ref(getFirebaseStorage(), path);
    await uploadString(storageRef, imageUrl, "data_url");
    imageUrl = await getDownloadURL(storageRef);
  }
  const payload = {
    userId,
    ...input,
    imageUrl,
    usageCount: 0,
    createdAt: Date.now(),
  };
  const refDoc = await addDoc(collection(getFirebaseDb(), COL.items), payload);
  return { id: refDoc.id, ...payload };
}

export async function seedItemsIfEmpty(
  userId: string,
  seed: Array<Omit<ClothingItem, "id" | "userId" | "createdAt" | "usageCount">>,
  gender?: Gender
): Promise<ClothingItem[]> {
  const existing = await fetchItems(userId, gender);
  if (existing.length > 0) return existing;

  const db = getFirebaseDb();
  const batch = writeBatch(db);
  const now = Date.now();
  const created = seed.map((input, index) => {
    const refDoc = doc(collection(db, COL.items));
    const item: ClothingItem = {
      id: refDoc.id,
      userId,
      ...input,
      usageCount: 0,
      createdAt: now + index,
    };
    batch.set(refDoc, {
      userId,
      ...input,
      usageCount: 0,
      createdAt: item.createdAt,
    });
    return item;
  });

  await batch.commit();
  return created.sort((a, b) => b.createdAt - a.createdAt);
}

export async function patchItem(_userId: string, id: string, patch: Partial<ClothingItem>) {
  await updateDoc(doc(getFirebaseDb(), COL.items, id), patch as DocumentData);
  return patch;
}

export async function removeItem(_userId: string, id: string) {
  await deleteDoc(doc(getFirebaseDb(), COL.items, id));
}

export async function fetchOutfits(userId: string): Promise<Outfit[]> {
  const q = query(
    collection(getFirebaseDb(), COL.outfits),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToOutfit(d.id, d.data(), userId));
}

export async function createOutfit(outfit: Outfit): Promise<Outfit> {
  const { id: _id, ...data } = outfit;
  const refDoc = await addDoc(collection(getFirebaseDb(), COL.outfits), data);
  return { ...outfit, id: refDoc.id };
}

export async function patchOutfit(id: string, patch: Partial<Outfit>) {
  await updateDoc(doc(getFirebaseDb(), COL.outfits, id), patch as DocumentData);
}

export async function removeOutfit(id: string) {
  await deleteDoc(doc(getFirebaseDb(), COL.outfits, id));
}

export async function fetchChat(userId: string): Promise<ChatMessage[]> {
  const q = query(
    collection(getFirebaseDb(), COL.chat),
    where("userId", "==", userId),
    orderBy("timestamp", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      role: data.role,
      content: data.content,
      timestamp: data.timestamp,
    } as ChatMessage;
  });
}

export async function addChatMessage(userId: string, msg: Omit<ChatMessage, "id">) {
  await addDoc(collection(getFirebaseDb(), COL.chat), { userId, ...msg });
}

export async function clearChat(userId: string) {
  const messages = await fetchChat(userId);
  await Promise.all(messages.map((m) => deleteDoc(doc(getFirebaseDb(), COL.chat, m.id))));
}

export async function deleteUserFirestoreData(userId: string) {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  const collections = [COL.items, COL.outfits, COL.chat] as const;

  for (const collectionName of collections) {
    const q = query(collection(db, collectionName), where("userId", "==", userId));
    const snap = await getDocs(q);
    snap.docs.forEach((document) => batch.delete(document.ref));
  }

  batch.delete(doc(db, COL.users, userId));
  await batch.commit();
}
