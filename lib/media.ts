import { apiFetch } from "./api";

export type MediaItem = {
  id: string;
  url: string;
  filename: string;
  alt: string | null;
  caption: string | null;
  title: string | null;
  description: string | null;
  mimeType: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  createdAt: string;
  updatedAt: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type MediaListResponse = {
  data: MediaItem[];
  pagination: Pagination;
};

const MEDIA_BASE = "/media-library";

export async function listMedia(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<MediaListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.search) searchParams.set("search", params.search);
  const qs = searchParams.toString();
  return apiFetch<MediaListResponse>(`${MEDIA_BASE}${qs ? `?${qs}` : ""}`);
}

export async function getMedia(id: string): Promise<MediaItem> {
  const data = await apiFetch<{ data: MediaItem } | MediaItem>(`${MEDIA_BASE}/${id}`);
  return (data as { data: MediaItem }).data || (data as MediaItem);
}

export async function updateMedia(
  id: string,
  data: {
    alt?: string;
    caption?: string;
    title?: string;
    description?: string;
    filename?: string;
  },
): Promise<MediaItem> {
  const res = await apiFetch<{ data: MediaItem } | MediaItem>(`${MEDIA_BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return (res as { data: MediaItem }).data || (res as MediaItem);
}

export async function deleteMedia(id: string): Promise<void> {
  await apiFetch(`${MEDIA_BASE}/${id}`, { method: "DELETE" });
}

export type UploadMediaResult = {
  url: string;
  mediaId: string;
  filename: string;
};

export async function createMediaFromUrl(data: {
  url: string;
  filename: string;
  alt?: string;
  caption?: string;
  title?: string;
  description?: string;
  mimeType?: string;
}): Promise<MediaItem> {
  const res = await apiFetch<{ data: MediaItem }>(`${MEDIA_BASE}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function uploadMedia(file: File): Promise<UploadMediaResult> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<UploadMediaResult>(`${MEDIA_BASE}/upload`, {
    method: "POST",
    body: formData,
    headers: {},
  });
}

export async function uploadMultipleMedia(files: File[]): Promise<UploadMediaResult[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("images", file);
  }
  const res = await apiFetch<{ result: UploadMediaResult[] }>(`${MEDIA_BASE}/upload/multiple`, {
    method: "POST",
    body: formData,
    headers: {},
  });
  return res.result;
}

export async function batchMedia(ids: string[]): Promise<Record<string, MediaItem>> {
  const res = await apiFetch<{ data: Record<string, MediaItem> }>(`${MEDIA_BASE}/batch`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
  return res.data;
}
