"use client";

import { useState } from "react";
import { getFullImageUrl } from "@/lib/getFullImageUrl";

type GalleryImageProps = {
  src: string;
  alt: string;
  className?: string;
};

export function GalleryImage({ src, alt, className = "" }: GalleryImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 bg-[#f5f5f5] animate-pulse" />
      )}
      <img
        src={getFullImageUrl(src)}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`${className} ${loaded ? "" : "opacity-0"}`}
      />
    </>
  );
}
