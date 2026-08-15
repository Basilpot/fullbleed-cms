"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, ImageIcon, X, GalleryThumbnails } from "lucide-react";
import { MediaPicker } from "./media-picker";
import type { MediaItem } from "@/lib/media";
import { getFullImageUrl } from "@/lib/getFullImageUrl";
import type { Tab } from "./media-picker";

type ImageValue = {
  url: string;
  mediaId?: string;
};

type ImageUploadProps = {
  value?: ImageValue | string | null;
  onChange?: (value: ImageValue) => void;
  label?: string;
  accept?: string;
};

export function ImageUpload({
  value,
  onChange,
  label = "Image",
}: ImageUploadProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<Tab>("library");

  const currentUrl = typeof value === "string" ? value : value?.url || null;

  const openPicker = (tab: Tab) => {
    setPickerTab(tab);
    setPickerOpen(true);
  };

  const handlePickerSelect = (media: MediaItem) => {
    onChange?.({ url: media.url, mediaId: media.id });
  };

  const handleClear = () => {
    onChange?.({ url: "" });
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-[#171717]">{label}</Label>

      {currentUrl ? (
        <div className="relative h-32 w-full max-w-xs rounded-md overflow-hidden border border-[#ebebeb] bg-[#fafafa]">
          <img
            src={getFullImageUrl(currentUrl)}
            alt=""
            className="object-contain w-full h-full"
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-1 right-1 bg-white/80 rounded-full p-1 hover:bg-white transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="h-32 w-full max-w-xs rounded-md border border-dashed border-[#ebebeb] bg-[#fafafa]/30 flex items-center justify-center text-[#888888]">
          <ImageIcon className="h-8 w-8 opacity-40" />
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => openPicker("upload")}
          className="rounded-full border-[#ebebeb] text-[#171717]"
        >
          <Upload className="h-4 w-4 mr-1" />
          {currentUrl ? "Change" : "Upload"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => openPicker("library")}
          className="rounded-full border-[#ebebeb] text-[#171717]"
        >
          <GalleryThumbnails className="h-4 w-4 mr-1" />
          Browse Library
        </Button>
      </div>

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handlePickerSelect}
        defaultTab={pickerTab}
      />
    </div>
  );
}
