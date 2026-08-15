// imageCompressor.ts

const MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB

export async function compressIfNeeded(
  file: File,
  {
    maxSizeBytes = MAX_SIZE_BYTES,
    maxDimension = 1920,
    initialQuality = 0.82,
  }: {
    maxSizeBytes?: number;
    maxDimension?: number;
    initialQuality?: number;
  } = {},
): Promise<File> {
  // Already small enough — return as-is
  console.log(
    "Original file:",
    file.name,
    (file.size / 1024 / 1024).toFixed(2) + " MB",
  );
  if (file.size <= maxSizeBytes) return file;

  const bitmap = await createImageBitmap(file);
  let w = bitmap.width;
  let h = bitmap.height;

  // Scale down oversized dimensions
  if (w > maxDimension || h > maxDimension) {
    const ratio = Math.min(maxDimension / w, maxDimension / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  // Iteratively reduce quality until under target
  let quality = initialQuality;
  let blob: Blob | null = null;

  for (let attempts = 0; attempts < 10; attempts++) {
    blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
        "image/webp",
        quality,
      ),
    );
    if (blob.size <= maxSizeBytes) break;
    quality = Math.max(
      0.1,
      quality - (blob.size > maxSizeBytes * 3 ? 0.2 : 0.08),
    );
  }

  if (!blob) throw new Error("Compression failed");

  // Return as a File so FormData works exactly the same
  const compressedName = file.name.replace(/\.[^.]+$/, ".webp"); // ← changed from .jpg
  console.log(
    "📦 Compressed to:",
    (blob.size / 1024 / 1024).toFixed(2) + " MB",
  );
  return new File([blob], compressedName, { type: "image/webp" });
}
