"use client";

import { useState, useCallback } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { toast } from "sonner";
import { Crop, Loader2 } from "lucide-react";
import { uploadMedia } from "@/lib/media";
import type { MediaItem } from "@/lib/media";

type CropDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: MediaItem;
  onCropComplete: (croppedMedia: MediaItem) => void;
};

const ASPECT_OPTIONS = [
  { label: "Free", value: NaN },
  { label: "16:9", value: 16 / 9 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "1:1", value: 1 },
  { label: "2:3", value: 2 / 3 },
  { label: "3:4", value: 3 / 4 },
  { label: "9:16", value: 9 / 16 },
];

export function CropDialog({ open, onOpenChange, media, onCropComplete }: CropDialogProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number>(NaN);
  const [aspectLabel, setAspectLabel] = useState("Free");
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropChange = useCallback((location: Point) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((z: number) => {
    setZoom(z);
  }, []);

  const onCropAreaComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleAspectChange = (value: string) => {
    const option = ASPECT_OPTIONS.find((o) => o.label === value);
    if (option) {
      setAspect(option.value);
      setAspectLabel(option.label);
    }
  };

  const handleApply = useCallback(async () => {
    if (!croppedAreaPixels) return;

    setProcessing(true);
    try {
      const image = new Image();
      image.crossOrigin = "anonymous";

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Failed to load image for crop"));
        image.src = media.url;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get canvas context");

      canvas.width = Math.round(croppedAreaPixels.width);
      canvas.height = Math.round(croppedAreaPixels.height);

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 92),
      );
      if (!blob) throw new Error("Failed to create image blob");

      const file = new File([blob], `${media.filename.replace(/\.[^.]+$/, "")}-crop.webp`, {
        type: "image/webp",
      });

      const result = await uploadMedia(file);
      const croppedMedia: MediaItem = {
        id: result.mediaId,
        url: result.url,
        filename: result.filename,
        alt: media.alt,
        caption: media.caption,
        title: media.title,
        description: media.description,
        mimeType: "image/webp",
        fileSize: blob.size,
        width: Math.round(croppedAreaPixels.width),
        height: Math.round(croppedAreaPixels.height),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onCropComplete(croppedMedia);
      onOpenChange(false);
      toast.success("Cropped image saved to library");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Crop failed");
    } finally {
      setProcessing(false);
    }
  }, [croppedAreaPixels, media, onCropComplete, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#171717]">
            <Crop className="h-4 w-4" />
            Crop Image
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 relative min-h-[400px] rounded-md overflow-hidden bg-black/5">
          <Cropper
            image={media.url}
            crop={crop}
            zoom={zoom}
            aspect={isNaN(aspect) ? undefined : aspect}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropAreaComplete}
          />
        </div>

        <div className="space-y-3 pt-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-[#888888]">Zoom</Label>
              <span className="text-xs text-[#888888]">{zoom.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-2 bg-[#ebebeb] rounded-full appearance-none cursor-pointer accent-[#171717]"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-[#888888]">Aspect Ratio</Label>
            <Select value={aspectLabel} onValueChange={handleAspectChange}>
              <SelectTrigger className="w-28 rounded-sm border-[#ebebeb]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.label} value={opt.label}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-[#888888]">
            A new cropped copy will be saved to the media library. The original is preserved.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing} className="rounded-full border-[#ebebeb]">
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={processing || !croppedAreaPixels} className="rounded-full bg-[#171717] text-white hover:bg-[#171717]/90">
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Cropping...
              </>
            ) : (
              "Apply Crop"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
