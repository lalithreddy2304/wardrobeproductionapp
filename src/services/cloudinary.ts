const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1";
const MAX_CLOUDINARY_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type CloudinaryUploadResponse = {
  secure_url?: string;
  url?: string;
  public_id?: string;
  bytes?: number;
  format?: string;
  error?: {
    message?: string;
  };
};

export class CloudinaryUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudinaryUploadError";
  }
}

export function isDataUrl(value: string) {
  return value.startsWith("data:");
}

export async function uploadWardrobeImage(dataUrl: string, userId: string): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const folder = import.meta.env.VITE_CLOUDINARY_FOLDER || `wardrobe/${userId}`;

  console.log("CLOUD_NAME", import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);
  console.log("UPLOAD_PRESET", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  validateCloudinaryConfig(cloudName, uploadPreset, folder);
  validateImageDataUrl(dataUrl);

  const formData = new FormData();
  formData.append("file", dataUrl);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", folder);
  formData.append("tags", "wardrobe,clothing");

  const endpoint = `${CLOUDINARY_UPLOAD_URL}/${encodeURIComponent(cloudName)}/image/upload`;
  console.info("[wardrobe:cloudinary] Upload endpoint called", {
    endpoint,
    folder,
    imageLength: dataUrl.length,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });
  const body = (await response.json().catch(() => ({}))) as CloudinaryUploadResponse;

  if (!response.ok) {
    throw new CloudinaryUploadError(
      body.error?.message || `Cloudinary upload failed with status ${response.status}`
    );
  }

  const imageUrl = body.secure_url || body.url;
  if (!imageUrl) {
    throw new CloudinaryUploadError("Cloudinary did not return an image URL");
  }

  console.info("[wardrobe:cloudinary] Upload result", {
    publicId: body.public_id,
    bytes: body.bytes,
    format: body.format,
    imageUrl: summarizeImageUrl(imageUrl),
  });

  return imageUrl;
}

function validateCloudinaryConfig(
  cloudName: string | undefined,
  uploadPreset: string | undefined,
  folder: string
) {
  console.log("DEBUG CLOUDINARY", {
    cloudName,
    uploadPreset,
    folder,
    envKeys: Object.keys(import.meta.env).filter(k => k.includes("CLOUDINARY"))
  });
  if (!cloudName || !uploadPreset) {
    throw new CloudinaryUploadError(
      "Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET."
    );
  }
}

function validateImageDataUrl(dataUrl: string) {
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    throw new CloudinaryUploadError("Image upload payload is not a valid data URL");
  }

  const mimeType = match[1];
  const base64Payload = match[2];
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new CloudinaryUploadError("Please upload a JPG, PNG, or WebP image.");
  }

  const estimatedBytes = Math.ceil((base64Payload.length * 3) / 4);
  if (estimatedBytes > MAX_CLOUDINARY_IMAGE_SIZE) {
    throw new CloudinaryUploadError("Please upload an image under 10MB.");
  }
}

function summarizeImageUrl(imageUrl: string) {
  return {
    kind: imageUrl.startsWith("https://") ? "remote-url" : "other-url",
    length: imageUrl.length,
    prefix: imageUrl.slice(0, 48),
  };
}
