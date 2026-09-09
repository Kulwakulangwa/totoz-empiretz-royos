import { supabase } from "@/integrations/supabase/client";

const MAX_IMAGE_EDGE = 512;
const WEBP_QUALITY = 0.72;
export const PRODUCT_IMAGE_BUCKET = "product-images";

export type CompressedProductImage = {
  blob: Blob;
  width: number;
  height: number;
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read this image."));
    image.src = url;
  });
}

export async function compressProductImage(file: File): Promise<CompressedProductImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = Math.round((image.naturalWidth - sourceSize) / 2);
    const sourceY = Math.round((image.naturalHeight - sourceSize) / 2);
    const width = Math.min(MAX_IMAGE_EDGE, sourceSize);
    const height = width;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("This browser cannot compress images.");
    }

    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY);
    });

    if (!blob) {
      throw new Error("This browser could not create a WebP image.");
    }

    return { blob, width, height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function productImagePreview(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }

  return URL.createObjectURL(file);
}

export function normalizeProductImagePath(value?: string | null): string | null {
  let path = value?.trim();
  if (!path) return null;
  if (path.startsWith("blob:") || path.startsWith("data:")) return path;

  try {
    const url = new URL(path);
    const storageMatch = url.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign)\/product-images\/(.+)$/,
    );
    path = storageMatch?.[1] ?? url.pathname.replace(/^\/+/, "");
  } catch {
    path = path.split(/[?#]/, 1)[0] ?? path;
  }

  try {
    path = decodeURIComponent(path);
  } catch {
    // Keep the original path when legacy data contains malformed escaping.
  }

  path = path.replace(/^\/+/, "").replace(/^product-images\//, "");
  if (!path || path.includes("\\") || path.split("/").includes("..")) return null;
  return path;
}

export function resolveProductImageUrl(imagePath?: string | null): string | null {
  const path = normalizeProductImagePath(imagePath);
  if (!path) return null;
  if (path.startsWith("blob:") || path.startsWith("data:")) return path;
  return supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function createProductImagePath(warehouseId: string, sku: string): string {
  const safeSku = sku
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return `${warehouseId}/${safeSku || "product"}/${crypto.randomUUID()}.webp`;
}

export async function uploadProductImage(file: File, warehouseId: string, sku: string) {
  const compressed = await compressProductImage(file);
  const path = createProductImagePath(warehouseId, sku);
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, compressed.blob, {
      cacheControl: "31536000",
      contentType: "image/webp",
      upsert: false,
    });
  if (error) throw error;
  return path;
}

export async function removeProductImage(imagePath?: string | null) {
  const path = normalizeProductImagePath(imagePath);
  if (!path || path.startsWith("blob:") || path.startsWith("data:")) return;
  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
  if (error) throw error;
}
