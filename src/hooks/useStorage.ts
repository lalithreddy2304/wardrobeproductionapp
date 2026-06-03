import { useState } from "react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../lib/firebase";

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function useStorage(userId?: string) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = async (file: File, filename = file.name) => {
    if (!userId) {
      throw new Error("A userId is required to upload wardrobe images");
    }

    setUploading(true);
    setError(null);

    try {
      const path = `users/${userId}/wardrobe/${Date.now()}-${safeFilename(filename)}`;
      const imageRef = ref(storage, path);
      await uploadBytes(imageRef, file, { contentType: file.type });
      return await getDownloadURL(imageRef);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image upload failed";
      setError(message);
      throw new Error(message);
    } finally {
      setUploading(false);
    }
  };

  return { uploadImage, uploading, error };
}
