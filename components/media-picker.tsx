"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search,
  Upload,
  Loader2,
  Check,
  Link,
  ExternalLink,
  Library,
} from "lucide-react";
import { listMedia, uploadMedia, getMedia, createMediaFromUrl, updateMedia, type MediaItem, type Pagination } from "@/lib/media";
import { getFullImageUrl } from "@/lib/getFullImageUrl";
import { GalleryImage } from "@/components/gallery-image";

type MediaPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (media: MediaItem) => void;
  multiple?: boolean;
  defaultTab?: Tab;
};

export type Tab = "library" | "upload" | "url";

export function MediaPicker({ open, onOpenChange, onSelect, multiple, defaultTab }: MediaPickerProps) {
  const [tab, setTab] = useState<Tab>(defaultTab || "library");
  const PAGE_LIMIT = 40;

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<MediaItem | null>(null);
  const [pendingAlt, setPendingAlt] = useState("");
  const [pendingCaption, setPendingCaption] = useState("");
  const [pendingTitle, setPendingTitle] = useState("");
  const [pendingDescription, setPendingDescription] = useState("");
  const [updatingMetadata, setUpdatingMetadata] = useState(false);

  const [url, setUrl] = useState("");
  const [urlFilename, setUrlFilename] = useState("");
  const [urlAlt, setUrlAlt] = useState("");
  const [urlCaption, setUrlCaption] = useState("");
  const [urlTitle, setUrlTitle] = useState("");
  const [urlDescription, setUrlDescription] = useState("");
  const [urlPreviewError, setUrlPreviewError] = useState(false);
  const [urlMimeType, setUrlMimeType] = useState<string | null>(null);
  const [addingUrl, setAddingUrl] = useState(false);
  const urlFilenameManuallyEdited = useRef(false);

  const detectedExt = url.split("?").shift()?.split("#").shift()?.split(".").pop()?.toLowerCase() || "";
  const extToMime: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
    webp: "image/webp", svg: "image/svg+xml", avif: "image/avif", bmp: "image/bmp", ico: "image/x-icon",
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  useEffect(() => {
    if (open) {
      setTab(defaultTab || "library");
      resetStates();
      fetchMedia({ page: 1, limit: PAGE_LIMIT, search: undefined });
    }
  }, [open]);

  const resetStates = () => {
    setSelectedIds(new Set());
    setSearch("");
    setPage(1);
    setUploading(false);
    setLoadingMore(false);
    setPendingUpload(null);
    setPendingAlt("");
    setPendingCaption("");
    setPendingTitle("");
    setPendingDescription("");
    setUpdatingMetadata(false);
    setUrl("");
    setUrlFilename("");
    setUrlAlt("");
    setUrlCaption("");
    setUrlTitle("");
    setUrlDescription("");
    setUrlPreviewError(false);
    setUrlMimeType(null);
    setAddingUrl(false);
    urlFilenameManuallyEdited.current = false;
  };

  const handlePageSearch = (newSearch: string) => {
    setSearch(newSearch);
    setPage(1);
    if (open) fetchMedia({ page: 1, limit: PAGE_LIMIT, search: newSearch || undefined });
  };

  function fetchMedia(params: { page: number; limit: number; search?: string }) {
    setLoading(true);
    listMedia(params)
      .then((result) => {
        setMedia(result.data);
        setPagination(result.pagination);
      })
      .catch(() => setMedia([]))
      .finally(() => setLoading(false));
  }

  async function loadMore() {
    if (!pagination || page >= pagination.totalPages) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const result = await listMedia({ page: nextPage, limit: PAGE_LIMIT, search: search || undefined });
      setMedia((prev) => [...prev, ...result.data]);
      setPagination(result.pagination);
      setPage(nextPage);
    } catch {
      toast.error("Failed to load more images");
    } finally {
      setLoadingMore(false);
    }
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let uploaded = 0;
    try {
      for (const file of Array.from(files)) {
        try {
          const result = await uploadMedia(file);
          const fullItem = await getMedia(result.mediaId);
          uploaded++;
          if (!multiple) {
            setPendingUpload(fullItem);
            toast.success("Image uploaded");
            setUploading(false);
            return;
          }
        } catch {
          toast.error(`Failed to upload ${file.name}`);
        }
      }
      if (multiple) {
        toast.success(`${uploaded} image${uploaded === 1 ? "" : "s"} uploaded`);
        fetchMedia({ page: 1, limit: PAGE_LIMIT, search: search || undefined });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleAddUrl = async () => {
    if (!url.trim()) {
      toast.error("Please enter an image URL");
      return;
    }
    if (!urlFilename.trim()) {
      toast.error("Please enter a filename");
      return;
    }
    setAddingUrl(true);
    try {
      const item = await createMediaFromUrl({
        url: url.trim(),
        filename: urlFilename.trim(),
        alt: urlAlt.trim() || undefined,
        caption: urlCaption.trim() || undefined,
        title: urlTitle.trim() || undefined,
        description: urlDescription.trim() || undefined,
        mimeType: urlMimeType || undefined,
      });
      if (!multiple) {
        onSelect(item);
        onOpenChange(false);
        return;
      }
      toast.success("Media added from URL");
      setTab("library");
      fetchMedia({ page: 1, limit: PAGE_LIMIT, search: search || undefined });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add media");
    } finally {
      setAddingUrl(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!pendingUpload) return;
    setUpdatingMetadata(true);
    try {
      const updated = await updateMedia(pendingUpload.id, {
        alt: pendingAlt.trim() || undefined,
        caption: pendingCaption.trim() || undefined,
        title: pendingTitle.trim() || undefined,
        description: pendingDescription.trim() || undefined,
      });
      onSelect(updated);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update metadata");
    } finally {
      setUpdatingMetadata(false);
    }
  };

  const handleCancelUpload = () => {
    setPendingUpload(null);
    setPendingAlt("");
    setPendingCaption("");
    setPendingTitle("");
    setPendingDescription("");
  };

  const toggleSelect = (item: MediaItem) => {
    if (!multiple) {
      onSelect(item);
      onOpenChange(false);
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  };

  const handleConfirmMultiple = () => {
    const selected = media.filter((m) => selectedIds.has(m.id));
    selected.forEach((m) => onSelect(m));
    onOpenChange(false);
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "library", label: "Library", icon: <Library className="h-4 w-4" /> },
    { key: "upload", label: "Upload", icon: <Upload className="h-4 w-4" /> },
    { key: "url", label: "From URL", icon: <Link className="h-4 w-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Image</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 border-b mb-3">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-[#171717] text-[#171717]"
                  : "border-transparent text-[#888888] hover:text-[#171717]"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {tab === "library" && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#888888]" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => handlePageSearch(e.target.value)}
                  className="pl-8 h-9 text-sm rounded-sm border-[#ebebeb]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-md bg-[#f5f5f5] animate-pulse" />
                  ))}
                </div>
              ) : media.length === 0 ? (
                <div className="text-center py-12 text-sm text-[#888888]">No images found</div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {media.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleSelect(item)}
                        className={`relative aspect-square rounded-md overflow-hidden ring-1 ring-inset bg-white transition-all cursor-pointer ${
                          isSelected ? "ring-2 ring-[#171717]" : "ring-[#ebebeb] hover:ring-[#a1a1a1]"
                        }`}
                      >
                        <GalleryImage
                          src={item.url}
                          alt={item.alt || item.filename}
                          className="object-cover w-full h-full"
                        />
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-[#171717] text-white rounded-full p-0.5">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                          <p className="text-white text-[10px] truncate">{item.filename}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {multiple && selectedIds.size > 0 && (
              <div className="flex items-center justify-between pt-3 border-t border-[#ebebeb] mt-3">
                <span className="text-sm text-[#888888]">{selectedIds.size} selected</span>
                <Button size="sm" className="rounded-pill-sm" onClick={handleConfirmMultiple}>
                  Insert {selectedIds.size > 0 && `(${selectedIds.size})`}
                </Button>
              </div>
            )}

            {pagination && page < pagination.totalPages && (
              <div className="flex justify-center pt-3 border-t border-[#ebebeb] mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-pill-sm"
                >
                  {loadingMore ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : null}
                  Load more ({media.length} / {pagination.total} shown)
                </Button>
              </div>
            )}
          </>
        )}

        {tab === "upload" && !pendingUpload && (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-sm border-2 border-dashed border-[#ebebeb] rounded-lg p-12 text-center cursor-pointer hover:border-[#a1a1a1]/50 transition-colors"
            >
              {uploading ? (
                <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin text-[#888888]" />
              ) : (
                <Upload className="h-10 w-10 mx-auto mb-3 text-[#888888]" />
              )}
              <p className="text-sm font-medium mb-1">
                {uploading ? "Uploading..." : "Click to upload"}
              </p>
              <p className="text-xs text-[#888888]">
                Images will be added to the media library
              </p>
            </div>
          </div>
        )}

        {tab === "upload" && pendingUpload && (
          <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
            <div className="flex justify-center">
              <div className="relative max-h-48 rounded-md overflow-hidden border border-[#ebebeb] bg-[#fafafa]">
                <img
                  src={getFullImageUrl(pendingUpload.url)}
                  alt="Preview"
                  className="max-h-48 object-contain"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-[#171717]">Filename</Label>
              <Input value={pendingUpload.filename} disabled className="rounded-sm border-[#ebebeb] h-9 text-sm" />
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-[#171717]">Alt Text <span className="text-xs text-[#888888]">(SEO)</span></Label>
              <Input
                value={pendingAlt}
                onChange={(e) => setPendingAlt(e.target.value)}
                placeholder="Describe the image for screen readers"
                className="rounded-sm border-[#ebebeb] h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-[#171717]">Title <span className="text-xs text-[#888888]">(tooltip)</span></Label>
              <Input
                value={pendingTitle}
                onChange={(e) => setPendingTitle(e.target.value)}
                placeholder="Image title attribute"
                className="rounded-sm border-[#ebebeb] h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-[#171717]">Caption</Label>
              <Input
                value={pendingCaption}
                onChange={(e) => setPendingCaption(e.target.value)}
                placeholder="Caption displayed below the image"
                className="rounded-sm border-[#ebebeb] h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-[#171717]">Description</Label>
              <Textarea
                value={pendingDescription}
                onChange={(e) => setPendingDescription(e.target.value)}
                rows={2}
                placeholder="Additional details about this image"
                className="rounded-sm border-[#ebebeb] text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={handleCancelUpload}
                disabled={updatingMetadata}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-full bg-[#171717] text-white hover:bg-[#171717]/90"
                onClick={handleConfirmUpload}
                disabled={updatingMetadata}
              >
                {updatingMetadata ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Insert Image"
                )}
              </Button>
            </div>
          </div>
        )}

        {tab === "url" && (
          <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-[#171717]">Image URL <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Link className="absolute left-2.5 top-2.5 h-4 w-4 text-[#888888]" />
                <Input
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (!urlFilenameManuallyEdited.current) {
                      const name = e.target.value.split("?").shift()?.split("#").shift()?.split("/").pop()?.replace(/\.[^.]+$/, "") || "image";
                      setUrlFilename(name.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60));
                    }
                    const ext = e.target.value.split("?").shift()?.split("#").shift()?.split(".").pop()?.toLowerCase() || "";
                    setUrlMimeType(extToMime[ext] || null);
                  }}
                  placeholder="https://example.com/image.jpg"
                  className="pl-8 rounded-sm border-[#ebebeb] h-9 text-sm"
                />
              </div>
            </div>

            {url && (
              <div className="flex justify-center">
                <div className="relative max-h-48 rounded-md overflow-hidden border border-[#ebebeb] bg-[#fafafa]">
                  {urlPreviewError ? (
                    <div className="w-48 h-32 flex items-center justify-center text-sm text-[#888888]">
                      Preview not available
                    </div>
                  ) : (
                    <img
                      src={url}
                      alt="Preview"
                      className="max-h-48 object-contain"
                      onError={() => setUrlPreviewError(true)}
                      onLoad={() => setUrlPreviewError(false)}
                    />
                  )}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-1 right-1 bg-white/80 rounded-full p-1 hover:bg-white transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-sm font-medium text-[#171717]">Filename <span className="text-destructive">*</span></Label>
              <div className="flex gap-1 items-center">
                <Input
                  value={urlFilename}
                  onChange={(e) => {
                    urlFilenameManuallyEdited.current = true;
                    setUrlFilename(e.target.value);
                  }}
                  placeholder="my-image"
                  className="rounded-sm border-[#ebebeb] h-9 text-sm"
                />
                {detectedExt && ["jpg","jpeg","png","gif","webp","svg","avif","bmp","ico"].includes(detectedExt) && (
                  <span className="text-xs text-[#888888] shrink-0">.{detectedExt}</span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-[#171717]">Alt Text <span className="text-xs text-[#888888]">(SEO)</span></Label>
              <Input
                value={urlAlt}
                onChange={(e) => setUrlAlt(e.target.value)}
                placeholder="Describe the image for screen readers"
                className="rounded-sm border-[#ebebeb] h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-[#171717]">Title <span className="text-xs text-[#888888]">(tooltip)</span></Label>
              <Input
                value={urlTitle}
                onChange={(e) => setUrlTitle(e.target.value)}
                placeholder="Image title attribute"
                className="rounded-sm border-[#ebebeb] h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-[#171717]">Caption</Label>
              <Input
                value={urlCaption}
                onChange={(e) => setUrlCaption(e.target.value)}
                placeholder="Caption displayed below the image"
                className="rounded-sm border-[#ebebeb] h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-[#171717]">Description</Label>
              <Textarea
                value={urlDescription}
                onChange={(e) => setUrlDescription(e.target.value)}
                rows={2}
                placeholder="Additional details about this image"
                className="rounded-sm border-[#ebebeb] text-sm"
              />
            </div>

            <Button
              className="w-full rounded-full bg-[#171717] text-white hover:bg-[#171717]/90"
              onClick={handleAddUrl}
              disabled={addingUrl || !url.trim() || !urlFilename.trim()}
            >
              {addingUrl ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add to Library"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
