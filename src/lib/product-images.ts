const MAX_IMAGE_EDGE = 512;
const WEBP_QUALITY = 0.72;

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
