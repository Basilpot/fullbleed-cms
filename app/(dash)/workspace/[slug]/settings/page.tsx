"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FileUploadLabel,
  FormSkeleton,
  ImgPreview,
  RemoveBtn,
  SaveBar,
  Section,
  SettingsHeader,
  useSiteConfig,
  useUpload,
  type SiteConfig,
} from "@/components/site-config-shared";
import { Plus } from "lucide-react";

const ADDRESS_FIELDS = [
  ["street", "Street"],
  ["city", "City"],
  ["district", "District"],
  ["postalCode", "Postal code"],
  ["country", "Country"],
] as const;

export default function SettingsPage() {
  const { config, loading, saving, save } = useSiteConfig();
  const { uploadingField, upload } = useUpload();
  // Keyed on config so Discard/reset remounts the draft instead of syncing it
  // in an effect (which the react-hooks lint rule rightly flags).
  const [edited, setEdited] = useState<SiteConfig | null>(null);
  const draft = edited ?? config;

  if (loading || !draft)
    return (
      <div className="max-w-3xl">
        <SettingsHeader title="Settings" description="Business details shown on your website." />
        <FormSkeleton />
      </div>
    );

  const set = <K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) =>
    setEdited({ ...draft, [key]: value });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    save(draft);
  };

  return (
    <div className="max-w-3xl">
      <SettingsHeader
        title="Settings"
        description="Business details shown on your website. Enquiries from your contact forms are delivered to the contact email."
      />

      <form onSubmit={onSubmit} className="space-y-2">
        <Section title="Business">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Business name">
              <Input value={draft.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Established">
              <Input value={draft.established} onChange={(e) => set("established", e.target.value)} />
            </Field>
          </div>
          <Field label="Short description">
            <Textarea rows={3} value={draft.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
        </Section>

        <Section title="Contact">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact email">
              <Input type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="WhatsApp number">
              <Input value={draft.whatsAppNumber} onChange={(e) => set("whatsAppNumber", e.target.value)} />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Contact form submissions are emailed to this address. Leave it blank to keep enquiries in the dashboard
            only.
          </p>
        </Section>

        <Section title="Phone numbers">
          <div className="space-y-2">
            {draft.phoneNumbers.map((phone, index) => (
              <div className="flex items-start gap-2" key={index}>
                <div className="w-44">
                  <Input
                    placeholder="Label (e.g. mobile)"
                    value={phone.key}
                    onChange={(e) =>
                      set(
                        "phoneNumbers",
                        draft.phoneNumbers.map((p, i) => (i === index ? { ...p, key: e.target.value } : p)),
                      )
                    }
                  />
                </div>
                <Input
                  placeholder="Number"
                  value={phone.value}
                  onChange={(e) =>
                    set(
                      "phoneNumbers",
                      draft.phoneNumbers.map((p, i) => (i === index ? { ...p, value: e.target.value } : p)),
                    )
                  }
                />
                <RemoveBtn onClick={() => set("phoneNumbers", draft.phoneNumbers.filter((_, i) => i !== index))} />
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => set("phoneNumbers", [...draft.phoneNumbers, { key: "", value: "" }])}
          >
            <Plus className="h-4 w-4" />
            Add number
          </Button>
        </Section>

        <Section title="Address">
          <Field label="Full address">
            <Input value={draft.fullAddress} onChange={(e) => set("fullAddress", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            {ADDRESS_FIELDS.map(([key, label]) => (
              <Field key={key} label={label}>
                <Input
                  value={draft.address[key]}
                  onChange={(e) => set("address", { ...draft.address, [key]: e.target.value })}
                />
              </Field>
            ))}
          </div>
          <Field label="Opening hours">
            <Input value={draft.openHours} onChange={(e) => set("openHours", e.target.value)} />
          </Field>
        </Section>

        <Section title="Branding">
          <Field label="Website URL">
            <Input value={draft.url} onChange={(e) => set("url", e.target.value)} />
          </Field>
          <Field label="Logo">
            <div className="flex items-center gap-2">
              <ImgPreview src={draft.logo} />
              <FileUploadLabel
                fieldPath="logo"
                busy={uploadingField === "logo"}
                onUpload={(field, file) => upload(field, file, (key, value) => set(key as "logo", value))}
              />
            </div>
          </Field>
          <Field label="Social links">
            <div className="space-y-2">
              {draft.socials.map((social, index) => (
                <div className="flex items-start gap-2" key={index}>
                  <div className="w-44">
                    <Input
                      placeholder="Platform"
                      value={social.platform}
                      onChange={(e) =>
                        set(
                          "socials",
                          draft.socials.map((s, i) =>
                            i === index ? { ...s, platform: e.target.value } : s,
                          ),
                        )
                      }
                    />
                  </div>
                  <Input
                    placeholder="https://…"
                    value={social.url}
                    onChange={(e) =>
                      set(
                        "socials",
                        draft.socials.map((s, i) => (i === index ? { ...s, url: e.target.value } : s)),
                      )
                    }
                  />
                  <RemoveBtn
                    onClick={() => set("socials", draft.socials.filter((_, i) => i !== index))}
                  />
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => set("socials", [...draft.socials, { platform: "", url: "" }])}
            >
              <Plus className="h-4 w-4" />
              Add link
            </Button>
          </Field>
        </Section>

        <SaveBar saving={saving} onDiscard={() => setEdited(null)} />
      </form>
    </div>
  );
}