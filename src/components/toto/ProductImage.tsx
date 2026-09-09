import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveProductImageUrl } from "@/lib/product-images";

type Props = {
  imagePath?: string | null | undefined;
  alt: string;
  className?: string | undefined;
  imageClassName?: string | undefined;
};

export function ProductImage({ imagePath, alt, className, imageClassName }: Props) {
  const src = resolveProductImageUrl(imagePath);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-md border border-border",
        "bg-muted text-muted-foreground",
        className ?? "size-10",
      )}
    >
      {src && src !== failedSrc ? (
        <img
          src={src}
          alt={alt}
          className={cn("h-full w-full object-cover", imageClassName)}
          loading="lazy"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <ImageIcon className="size-4" aria-hidden="true" />
      )}
    </div>
  );
}
