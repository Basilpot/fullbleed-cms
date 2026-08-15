"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Link, Loader2, ExternalLink } from "lucide-react";
import { createMediaFromUrl } from "@/lib/media";

type AddMediaUrlDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function AddMediaUrlDialog({ open, onOpenChange, onSuccess }: AddMediaUrlDialogProps) {
  const [url, setUrl] = useState("");
  const [filename, setFilename] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const filenameManuallyEdited = useRef(false);

  const detectedExt = url.split("?").shift()?.split("#").shift()?.split(".").pop()?.toLowerCase() || "";
  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif", "bmp", "ico"];
  const extToMime: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
    webp: "image/webp", svg: "image/svg+xml", avif: "image/avif", bmp: "image/bmp", ico: "image/x-icon",
  };

  const resetForm = () => {
    setUrl("");
    setFilename("");
    setAlt("");
    setCaption("");
    setTitle("");
    setDescription("");
    setPreviewError(false);
    setMimeType(null);
    filenameManuallyEdited.current = false;
  };

  const handleOpenChangeWrapper = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!url.trim()) {
      toast.error("Please enter an image URL");
      return;
    }
    if (!filename.trim()) {
      toast.error("Please enter a filename");
      return;
    }
    setSaving(true);
    try {
      await createMediaFromUrl({
        url: url.trim(),
        filename: filename.trim(),
        alt: alt.trim() || undefined,
        caption: caption.trim() || undefined,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        mimeType: mimeType || undefined,
      });
      toast.success("Media added from URL");
      onSuccess?.();
      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add media");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChangeWrapper}>
      <DialogContent className="sm:max-w-lg rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-[#171717]">Insert from URL</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-sm font-medium text-[#171717]">Image URL <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Link className="absolute left-2.5 top-2.5 h-4 w-4 text-[#888888]" />
              <Input
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (!filenameManuallyEdited.current) {
                    const name = e.target.value.split("?").shift()?.split("#").shift()?.split("/").pop()?.replace(/\.[^.]+$/, "") || "image";
                    setFilename(name.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60));
                  }
                  const ext = e.target.value.split("?").shift()?.split("#").shift()?.split(".").pop()?.toLowerCase() || "";
                  setMimeType(extToMime[ext] || null);
                }}
                placeholder="https://example.com/image.jpg"
                className="pl-8 rounded-sm border-[#ebebeb] h-9 text-sm"
              />
            </div>
          </div>

          {url && (
            <div className="flex justify-center">
              <div className="relative max-h-48 rounded-md overflow-hidden border border-[#ebebeb] bg-[#fafafa]">
                {previewError ? (
                  <div className="w-48 h-32 flex items-center justify-center text-sm text-[#888888]">
                    Preview not available
                  </div>
                ) : (
                  <img
                    src={url}
                    alt="Preview"
                    className="max-h-48 object-contain"
                    onError={() => setPreviewError(true)}
                    onLoad={() => setPreviewError(false)}
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
                value={filename}
                onChange={(e) => {
                  filenameManuallyEdited.current = true;
                  setFilename(e.target.value);
                }}
                placeholder="my-image"
                className="rounded-sm border-[#ebebeb] h-9 text-sm"
              />
              {detectedExt && imageExts.includes(detectedExt) && (
                <span className="text-xs text-[#888888] shrink-0">.{detectedExt}</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-medium text-[#171717]">Alt Text <span className="text-xs text-[#888888]">(SEO)</span></Label>
            <Input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Describe the image for screen readers"
              className="rounded-sm border-[#ebebeb] h-9 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-medium text-[#171717]">Title <span className="text-xs text-[#888888]">(tooltip)</span></Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Image title attribute"
              className="rounded-sm border-[#ebebeb] h-9 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-medium text-[#171717]">Caption</Label>
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption displayed below the image"
              className="rounded-sm border-[#ebebeb] h-9 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-medium text-[#171717]">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Additional details about this image"
              className="rounded-sm border-[#ebebeb] text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }} className="rounded-full border-[#ebebeb]">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="rounded-full bg-[#171717] text-white hover:bg-[#171717]/90">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Adding...
              </>
            ) : (
              "Add to Library"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
