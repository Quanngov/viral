"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  VIRAL_THUMBNAIL_PLACEHOLDER,
  normalizePlatform,
  resolveExternalIdFromClientId,
  resolveThumbnailUrl,
  type ThumbnailPlatform,
} from "@/lib/video-thumbnail";
import { reportThumbnailLoadFailure } from "@/lib/report-thumbnail-failure";
import { PlatformIcon } from "@/components/dashboard/PlatformIcon";

type VideoThumbnailProps = {
  platform?: string;
  externalId?: string | null;
  clientId?: string;
  thumbnailUrl?: string | null;
  alt?: string;
  className?: string;
  imageClassName?: string;
  /** next/image fill mode */
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  width?: number;
  height?: number;
  /** Use native img (feed cards) vs next/image */
  native?: boolean;
};

export function VideoThumbnail({
  platform,
  externalId,
  clientId,
  thumbnailUrl,
  alt = "",
  className = "",
  imageClassName = "object-cover",
  fill,
  sizes,
  priority,
  width,
  height,
  native = false,
}: VideoThumbnailProps) {
  const plat = normalizePlatform(platform, clientId) as ThumbnailPlatform;
  const ext =
    externalId?.trim() ||
    (clientId ? resolveExternalIdFromClientId(clientId) : null);
  const primary = resolveThumbnailUrl(plat, ext, thumbnailUrl, clientId);
  const [usePlaceholder, setUsePlaceholder] = useState(!primary);

  useEffect(() => {
    setUsePlaceholder(!primary);
  }, [primary]);

  const onError = useCallback(() => {
    if (!usePlaceholder && plat === "instagram" && ext) {
      reportThumbnailLoadFailure("instagram", ext);
    }
    setUsePlaceholder(true);
  }, [usePlaceholder, plat, ext]);

  const src = usePlaceholder ? VIRAL_THUMBNAIL_PLACEHOLDER : primary;
  const isPlaceholder = usePlaceholder;

  if (native || isPlaceholder) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          onError={onError}
          className={`h-full w-full ${isPlaceholder ? "object-contain p-3 opacity-40" : imageClassName}`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
        />
        {isPlaceholder ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <PlatformIcon platform={plat === "tiktok" ? "tiktok" : plat === "instagram" ? "instagram" : "youtube"} size={28} className="opacity-30" />
          </div>
        ) : null}
      </div>
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? "120px"}
        className={imageClassName}
        onError={onError}
        priority={priority}
        loading={priority ? undefined : "lazy"}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 120}
      height={height ?? 160}
      className={imageClassName}
      onError={onError}
      priority={priority}
    />
  );
}
