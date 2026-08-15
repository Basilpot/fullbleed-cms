"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MediaPicker } from "@/components/media-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PALETTES } from "@/lib/theme/palettes";
import { FONTS, DEFAULT_FONTS, getFont } from "@/lib/theme/fonts";
import {
  Field,
  FileUploadLabel,
  FormSkeleton,
  ImgPreview,
  SaveBar,
  Section,
  SettingsHeader,
  useSiteConfig,
  useUpload,
  type SiteConfig,
} from "@/components/site-config-shared";

const SLICE = [
  "name",
  "established",
  "logo",
  "image",
  "description",
  "url",
  "experience",
  "openHours",
] as const;
type Slice = Record<(typeof SLICE)[number], string>;

function pick(c: SiteConfig): Slice {
  return {
    name: c.name,
    established: c.established,
    logo: c.logo,
    image: c.image,
    description: c.description,
    url: c.url,
    experience: c.experience,
    openHours: c.openHours,
  };
}

export default function BrandPage() {
  const { config, loading, saving, save } = useSiteConfig();
  const { uploadingField, upload } = useUpload();
  const [values, setValues] = useState<Slice>({
    name: "",
    established: "",
    logo: "",
    image: "",
    description: "",
    url: "",
    experience: "",
    openHours: "",
  });
  const [synced, setSynced] = useState(false);
  const [pickerField, setPickerField] = useState<string | null>(null);
  const [palette, setPalette] = useState("");
  const [fonts, setFonts] = useState({ primary: "", secondary: "" });

  useEffect(() => {
    const primary = getFont(fonts.primary) ?? getFont(DEFAULT_FONTS.primary);
    const secondary = getFont(fonts.secondary) ?? getFont(DEFAULT_FONTS.secondary);
    if (!primary || !secondary) return;
    const family = (f: string) => f.replace(/ /g, "+");
    const href =
      `https://fonts.googleapis.com/css2?family=${family(primary.family)}:wght@400;500;600;700` +
      `&family=${family(secondary.family)}:wght@400;600;700&display=swap`;
    const id = "brand-fonts-link";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [fonts.primary, fonts.secondary]);

  if (config && !synced) {
    setSynced(true);
    setValues({
      ...pick(config),
      name: config.name || "",
      logo: config.logo || "",
    });
    setPalette(config.palette);
    setFonts({
      primary: config.fonts.primary || DEFAULT_FONTS.primary,
      secondary: config.fonts.secondary || DEFAULT_FONTS.secondary,
    });
    return <FormSkeleton />;
  }

  if (loading) return <FormSkeleton />;

  const set = (key: string, value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    save({ ...values, palette, fonts });
  };

  const handleDiscard = () => {
    if (!config) return;
    setValues(pick(config));
    setPalette(config.palette);
    setFonts({
      primary: config.fonts.primary || DEFAULT_FONTS.primary,
      secondary: config.fonts.secondary || DEFAULT_FONTS.secondary,
    });
  };

  return (
    <>
      <SettingsHeader
        title="Basic Brand"
        description="Your business name, logo and short introduction shown on the storefront."
      />
      <form
        onSubmit={handleSave}
      >
        <Section title="Brand identity">
          <Field label="Business name">
            <Input
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ash and Moss"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Established">
              <Input
                value={values.established}
                onChange={(e) => set("established", e.target.value)}
                placeholder="2015"
              />
            </Field>
            <Field label="Tagline">
              <Input
                value={values.experience}
                onChange={(e) => set("experience", e.target.value)}
                placeholder="Custom furniture, cut to your room."
              />
            </Field>
          </div>
          <Field label="Logo">
            <div className="flex items-center gap-2">
              <ImgPreview src={values.logo} />
              <Input
                value={values.logo}
                onChange={(e) => set("logo", e.target.value)}
                placeholder="Logo URL"
              />
              <FileUploadLabel
                fieldPath="logo"
                busy={uploadingField === "logo"}
                onUpload={(field, file) => upload(field, file, set)}
                onPick={setPickerField}
              />
            </div>
          </Field>
          <Field label="Hero image">
            <div className="flex items-center gap-2">
              <ImgPreview src={values.image} />
              <Input
                value={values.image}
                onChange={(e) => set("image", e.target.value)}
                placeholder="Hero image URL"
              />
              <FileUploadLabel
                fieldPath="image"
                busy={uploadingField === "image"}
                onUpload={(field, file) => upload(field, file, set)}
                onPick={setPickerField}
              />
            </div>
          </Field>
        </Section>

        <Section title="Introduction">
          <Field label="Short description">
            <Textarea
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder="What makes this business special?"
            />
          </Field>
        </Section>

        <Section title="Color palette">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPalette(p.id)}
                className={cn(
                  "rounded-lg border p-2 text-left transition-all hover:shadow-md cursor-pointer",
                  palette === p.id
                    ? "border-primary ring-2 ring-primary"
                    : "border-border",
                )}
              >
                <div className="flex h-6 overflow-hidden rounded-md">
                  {p.swatch.map((c) => (
                    <span
                      key={c}
                      className="flex-1"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-xs font-medium truncate">{p.name}</p>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Fonts">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Primary font (body)">
              <Select
                value={fonts.primary || DEFAULT_FONTS.primary}
                onValueChange={(v) => setFonts((f) => ({ ...f, primary: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a font" />
                </SelectTrigger>
                <SelectContent>
                  {FONTS.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Secondary font (headings)">
              <Select
                value={fonts.secondary || DEFAULT_FONTS.secondary}
                onValueChange={(v) =>
                  setFonts((f) => ({ ...f, secondary: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a font" />
                </SelectTrigger>
                <SelectContent>
                  {FONTS.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="mt-3 rounded-lg border p-4">
            <p
              className="text-base"
              style={{
                fontFamily: `"${getFont(fonts.primary || DEFAULT_FONTS.primary)?.family}", sans-serif`,
              }}
            >
              Custom furniture, cut to your room — primary body font.
            </p>
            <p
              className="mt-2 text-2xl font-bold"
              style={{
                fontFamily: `"${getFont(fonts.secondary || DEFAULT_FONTS.secondary)?.family}", sans-serif`,
              }}
            >
              Ash & Moss — secondary heading font.
            </p>
          </div>
        </Section>

        <SaveBar saving={saving} onDiscard={handleDiscard} />
      </form>

      <MediaPicker
        open={pickerField !== null}
        onOpenChange={(open) => {
          if (!open) setPickerField(null);
        }}
        defaultTab="upload"
        onSelect={(media) => {
          if (pickerField) set(pickerField, media.url);
          setPickerField(null);
        }}
      />
    </>
  );
}
