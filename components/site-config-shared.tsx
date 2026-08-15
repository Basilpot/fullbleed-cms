"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { uploadMedia } from "@/lib/media";
import { getFullImageUrl } from "@/lib/getFullImageUrl";

const API = "/api/site-config";

export type SiteConfig = {
  name: string;
  established: string;
  logo: string;
  description: string;
  url: string;
  image: string;
  whatsAppNumber: string;
  email: string;
  openHours: string;
  experience: string;
  fullAddress: string;
  address: {
    city: string;
    street: string;
    district: string;
    country: string;
    postalCode: string;
  };
  phoneNumbers: { key: string; value: string }[];
  socials: { platform: string; url: string }[];
  documents: { title: string; key: string; path: string }[];
  reviews: {
    googleReview: { count: number; rating: number; link: string };
    tripadvisor: { count: number; rating: number; link: string };
  };
  gmb: { link: string; location: string };
  palette: string;
  fonts: { primary: string; secondary: string };
};

// Config is stored in the backend in compact shape: phoneNumbers as
// [{key: value}], socials/documents as plain objects.
function toForm(c: any): SiteConfig {
  return {
    name: c.name ?? "",
    established: c.established ?? "",
    logo: c.logo ?? "",
    description: c.description ?? "",
    url: c.url ?? "",
    image: c.image ?? "",
    whatsAppNumber: c.whatsAppNumber ?? "",
    email: c.email ?? "",
    openHours: c.openHours ?? "",
    experience: c.experience ?? "",
    fullAddress: c.fullAddress ?? "",
    address: {
      city: c.address?.city ?? "",
      street: c.address?.street ?? "",
      district: c.address?.district ?? "",
      country: c.address?.country ?? "",
      postalCode: c.address?.postalCode ?? "",
    },
    phoneNumbers: (c.phoneNumbers ?? []).map((p: Record<string, string>) => {
      const [key, value] = Object.entries(p)[0];
      return { key, value };
    }),
    socials: Object.entries(c.socials ?? {}).map(([platform, url]) => ({
      platform,
      url: url as string,
    })),
    documents: Object.entries(c.documents ?? {}).map(([key, path]) => ({
      title: key,
      key,
      path: path as string,
    })),
    reviews: {
      googleReview: {
        count: c.reviews?.googleReview?.count ?? 0,
        rating: c.reviews?.googleReview?.rating ?? 0,
        link: c.reviews?.googleReview?.link ?? "",
      },
      tripadvisor: {
        count: c.reviews?.tripadvisor?.count ?? 0,
        rating: c.reviews?.tripadvisor?.rating ?? 0,
        link: c.reviews?.tripadvisor?.link ?? "",
      },
    },
    gmb: { link: c.gmb?.link ?? "", location: c.gmb?.location ?? "" },
    palette: c.palette ?? "",
    fonts: {
      primary: c.fonts?.primary ?? "",
      secondary: c.fonts?.secondary ?? "",
    },
  };
}

function toApi(v: SiteConfig) {
  return {
    ...v,
    phoneNumbers: v.phoneNumbers.map((p) => ({ [p.key]: p.value })),
    socials: Object.fromEntries(v.socials.map((s) => [s.platform, s.url])),
    documents: Object.fromEntries(
      v.documents.map((d) => [d.key || d.title, d.path]),
    ),
  };
}

// Loads the tenant's site config once, keeps it in form-shape, and saves
// section patches merged into the full config (the API stores the whole JSON).
export function useSiteConfig() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(API)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setConfig(toForm(data?.config ?? {})))
      .catch(() => toast.error("Failed to load site config"))
      .finally(() => setLoading(false));
  }, []);

  const save = async (patch: Partial<SiteConfig>) => {
    if (!config) return;
    setSaving(true);
    try {
      const merged = { ...config, ...patch };
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toApi(merged)),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setConfig(merged);
      toast.success("Saved");
    } catch (e: any) {
      toast.error(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return { config, loading, saving, save };
}

export function useUpload() {
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const upload = async (
    field: string,
    file: File,
    setValue: (key: string, value: string) => void,
  ) => {
    setUploadingField(field);
    try {
      const result = await uploadMedia(file);
      setValue(field, result.url);
      toast.success("Uploaded");
    } catch (e: any) {
      toast.error(`Upload failed: ${e.message}`);
    } finally {
      setUploadingField(null);
    }
  };
  return { uploadingField, upload };
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
        <Separator className="flex-1" />
      </div>
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="shrink-0 text-destructive hover:border-destructive"
      onClick={onClick}
    >
      <X className="h-4 w-4" />
    </Button>
  );
}

export function FileUploadLabel({
  fieldPath,
  busy,
  onUpload,
  onPick,
  accept = "image/*",
}: {
  fieldPath: string;
  busy: boolean;
  onUpload: (fieldPath: string, file: File) => void;
  onPick?: (fieldPath: string) => void;
  accept?: string;
}) {
  if (onPick) {
    return (
      <Button
        type="button"
        variant="outline"
        className="shrink-0"
        onClick={() => onPick(fieldPath)}
      >
        Upload
      </Button>
    );
  }
  return (
    <Label
      className={`flex h-9 cursor-pointer items-center rounded-md border border-input px-3 text-xs font-medium text-muted-foreground hover:bg-muted shrink-0 ${busy ? "pointer-events-none opacity-50" : ""}`}
    >
      {busy ? "Uploading\u2026" : "Upload"}
      <input
        type="file"
        accept={accept}
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(fieldPath, f);
        }}
      />
    </Label>
  );
}

export function ImgPreview({ src }: { src: string | undefined }) {
  if (!src) return null;
  return (
    <img
      src={getFullImageUrl(src)}
      alt="preview"
      className="h-8 w-auto rounded object-contain"
    />
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

export function SettingsHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

export function SaveBar({
  saving,
  onDiscard,
}: {
  saving: boolean;
  onDiscard: () => void;
}) {
  return (
    <div className="sticky bottom-0 mt-8 border-t bg-background py-4 flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onDiscard}>
        Discard
      </Button>
      <Button type="submit" disabled={saving}>
        {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
        {saving ? "Saving\u2026" : "Save changes"}
      </Button>
    </div>
  );
}
