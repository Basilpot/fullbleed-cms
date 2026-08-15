import { compressIfNeeded } from "@/lib/imageCompressor";
import { uploadMedia as uploadMediaApi } from "@/lib/media";

export const uploadImageToCloudflare = async (file: File) => {
  const compressed = await compressIfNeeded(file);
  const result = await uploadMediaApi(compressed);
  return result.url;
};

export const uploadMultipleImagesToLocal = async (
  files: File[],
  folder?: string,
) => {
  const compressed = await Promise.all(files.map((f) => compressIfNeeded(f)));
  const results = await Promise.all(compressed.map((f) => uploadMediaApi(f)));
  return results.map((r) => r.url).filter(Boolean);
};
