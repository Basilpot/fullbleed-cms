"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Loader2,
  Link as LinkIcon,
  Crop,
} from "lucide-react";
import { listMedia, updateMedia, deleteMedia, uploadMedia, type MediaItem, type Pagination } from "@/lib/media";
import { getFullImageUrl } from "@/lib/getFullImageUrl";
import { GalleryImage } from "@/components/gallery-image";
import { AddMediaUrlDialog } from "@/components/add-media-url-dialog";
import { CropDialog } from "@/components/crop-dialog";

export default function MediaLibraryPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const [editForm, setEditForm] = useState({
    alt: "",
    caption: "",
    title: "",
    description: "",
    filename: "",
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<MediaItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [urlDialogOpen, setUrlDialogOpen] = useState(false);

  const [cropDialogOpen, setCropDialogOpen] = useState(false);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
  }, [search]);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listMedia({ page, limit, search: debouncedSearch || undefined });
      setMedia(result.data);
      setPagination(result.pagination);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load media");
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => {
    loadMedia();
  }, [page, limit, debouncedSearch, loadMedia]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let successCount = 0;
    let failCount = 0;
    for (const file of Array.from(files)) {
      try {
        await uploadMedia(file);
        successCount++;
      } catch {
        failCount++;
      }
    }
    if (successCount > 0) {
      toast.success(`${successCount} file(s) uploaded`);
      loadMedia();
    }
    if (failCount > 0) toast.error(`${failCount} file(s) failed`);
    setUploading(false);
  };

  const openEdit = (item: MediaItem) => {
    setEditingMedia(item);
    setEditForm({
      alt: item.alt || "",
      caption: item.caption || "",
      title: item.title || "",
      description: item.description || "",
      filename: item.filename.replace(/\.[^.]+$/, ""),
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingMedia) return;
    setSaving(true);
    try {
      await updateMedia(editingMedia.id, editForm);
      toast.success("Media updated");
      setEditDialogOpen(false);
      loadMedia();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteMedia(deleteConfirm.id);
      toast.success("Media deleted");
      setDeleteDialogOpen(false);
      setMedia((prev) => prev.filter((m) => m.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div className="mb-6">
        <PageHeader
          title="Media Library"
          description="Upload and manage images used across the site"
        >
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
            <Button
              size="lg"
              onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1" />
            )}
            Upload
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setUrlDialogOpen(true)}
          >
            <LinkIcon className="h-4 w-4 mr-1" />
            Insert from URL
          </Button>
        </div>
        </PageHeader>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#888888]" />
          <Input
            placeholder="Search by filename, alt, caption..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm rounded-sm border-[#ebebeb]"
          />
        </div>
        <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
          <SelectTrigger className="w-24 h-9 rounded-sm border-[#ebebeb] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30</SelectItem>
            <SelectItem value="60">60</SelectItem>
            <SelectItem value="90">90</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {Array.from({ length: limit > 12 ? 12 : limit }).map((_, i) => (
            <div key={i} className="aspect-square rounded-md bg-[#f5f5f5] animate-pulse" />
          ))}
        </div>
      ) : media.length === 0 ? (
        <div className="text-center py-16 text-[#888888]">
          <div className="text-4xl mb-3 opacity-30">
            <Upload className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-lg font-medium mb-1 text-[#171717]">No media yet</p>
          <p className="text-sm">Upload images to get started</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {media.map((item) => (
              <div
                key={item.id}
                className="group relative aspect-square rounded-md overflow-hidden ring-1 ring-inset ring-[#ebebeb] bg-white"
              >
                <GalleryImage
                  src={item.url}
                  alt={item.alt || item.filename}
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-2">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity w-full">
                    <div className="flex gap-1 mb-1">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 bg-white/90 hover:bg-white text-[#171717]"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7 bg-[#ee0000]/90 hover:bg-[#ee0000]"
                        onClick={() => {
                          setDeleteConfirm(item);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-white text-xs truncate leading-tight font-medium">
                      {item.filename}
                    </p>
                    {(item.alt || item.caption) && (
                      <p className="text-white/70 text-[10px] truncate leading-tight">
                        {item.alt || item.caption}
                      </p>
                    )}
                  </div>
                </div>
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                    {item.width && item.height
                      ? `${item.width}\u00d7${item.height}`
                      : formatFileSize(item.fileSize)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-[#888888]">
                {pagination.total} total &middot; Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= (pagination.totalPages)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-[#171717]">Edit Image Metadata</DialogTitle>
          </DialogHeader>
          {editingMedia && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-32 h-32 rounded-md overflow-hidden border border-[#ebebeb] shrink-0 bg-[#fafafa]">
                  <img
                    src={getFullImageUrl(editingMedia.url)}
                    alt={editForm.alt || editingMedia.filename}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="flex-1 space-y-1 text-sm text-[#888888]">
                  <p><span className="font-medium text-[#171717]">File:</span> {editingMedia.filename}</p>
                  {editingMedia.width && editingMedia.height && (
                    <p><span className="font-medium text-[#171717]">Dimensions:</span> {editingMedia.width}&times;{editingMedia.height}</p>
                  )}
                  {editingMedia.fileSize && (
                    <p><span className="font-medium text-[#171717]">Size:</span> {formatFileSize(editingMedia.fileSize)}</p>
                  )}
                  {editingMedia.mimeType && (
                    <p><span className="font-medium text-[#171717]">Type:</span> {editingMedia.mimeType}</p>
                  )}
                  <p><span className="font-medium text-[#171717]">URL:</span> <span className="text-xs break-all">{editingMedia.url}</span></p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setCropDialogOpen(true)}
                  >
                    <Crop className="h-3 w-3 mr-1" />
                    Crop Image
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-[#171717]">Filename</Label>
                <Input
                  value={editForm.filename}
                  disabled
                  className="rounded-sm border-[#ebebeb] h-9 text-sm opacity-60"
                />
                <p className="text-xs text-[#888888]">
                  Filename cannot be changed after upload.
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-[#171717]">Alt Text <span className="text-xs text-[#888888]">(SEO)</span></Label>
                <Input
                  value={editForm.alt}
                  onChange={(e) => setEditForm({ ...editForm, alt: e.target.value })}
                  placeholder="Descriptive text for screen readers and SEO"
                  className="rounded-sm border-[#ebebeb] h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-[#171717]">Title <span className="text-xs text-[#888888]">(tooltip)</span></Label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Image title attribute"
                  className="rounded-sm border-[#ebebeb] h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-[#171717]">Caption</Label>
                <Input
                  value={editForm.caption}
                  onChange={(e) => setEditForm({ ...editForm, caption: e.target.value })}
                  placeholder="Caption displayed below the image"
                  className="rounded-sm border-[#ebebeb] h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-[#171717]">Description</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2}
                  placeholder="Additional details about this image"
                  className="rounded-sm border-[#ebebeb] text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingMedia && (
        <CropDialog
          open={cropDialogOpen}
          onOpenChange={setCropDialogOpen}
          media={editingMedia}
          onCropComplete={(cropped) => {
            setEditingMedia(cropped);
            loadMedia();
          }}
        />
      )}

      <AddMediaUrlDialog
        open={urlDialogOpen}
        onOpenChange={setUrlDialogOpen}
        onSuccess={loadMedia}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-[#171717]">Delete Image</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#888888]">
            Are you sure you want to delete <strong className="text-[#171717]">{deleteConfirm?.filename}</strong>?
            This will remove the file from disk and cannot be undone.
          </p>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
