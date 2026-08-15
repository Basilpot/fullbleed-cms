"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FormSkeleton,
  RemoveBtn,
  SaveBar,
  Section,
  SettingsHeader,
  useSiteConfig,
  type SiteConfig,
} from "@/components/site-config-shared";
import { FieldDescription, FieldTitle } from "@/components/ui/field";

const DEFAULT_ADDRESS = {
  city: "",
  street: "",
  district: "",
  country: "",
  postalCode: "",
};

type ContactValues = {
  email: string;
  whatsAppNumber: string;
  phoneNumbers: { key: string; value: string }[];
  fullAddress: string;
  address: typeof DEFAULT_ADDRESS;
  socials: { platform: string; url: string }[];
};

function sliceFrom(config: SiteConfig): ContactValues {
  return {
    email: config.email,
    whatsAppNumber: config.whatsAppNumber,
    phoneNumbers: config.phoneNumbers,
    fullAddress: config.fullAddress,
    address: config.address,
    socials: config.socials,
  };
}

export default function ContactPage() {
  const { config, loading, saving, save } = useSiteConfig();
  const [values, setValues] = useState<ContactValues>({
    email: "",
    whatsAppNumber: "",
    phoneNumbers: [],
    fullAddress: "",
    address: DEFAULT_ADDRESS,
    socials: [],
  });
  const [synced, setSynced] = useState(false);

  if (config && !synced) {
    setSynced(true);
    setValues(sliceFrom(config));
    return <FormSkeleton />;
  }

  if (loading) return <FormSkeleton />;

  const set = (patch: Partial<typeof values>) =>
    setValues((v) => ({ ...v, ...patch }));
  const setPhone = (i: number, patch: Partial<{ key: string; value: string }>) =>
    set({
      phoneNumbers: values.phoneNumbers.map((p, j) =>
        j === i ? { ...p, ...patch } : p,
      ),
    });
  const setSocial = (
    i: number,
    patch: Partial<{ platform: string; url: string }>,
  ) =>
    set({
      socials: values.socials.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    });

  return (
    <>
      <SettingsHeader
        title="Contact & Social Media"
        description="How customers reach you, and the social profiles linked from the storefront."
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(values);
        }}
      >
        <Section title="Contact details">
          <Field label="Email">
            <Input
              type="email"
              value={values.email}
              onChange={(e) => set({ email: e.target.value })}
              placeholder="info@ashandmoss.com"
            />
          </Field>
          <Field label="WhatsApp number">
            <FieldDescription>This will be used in whatsapp icon popup in website.</FieldDescription>
            <Input
              value={values.whatsAppNumber}
              onChange={(e) => set({ whatsAppNumber: e.target.value })}
              placeholder="+977 9841328947"
            />
          </Field>
          <Field label="Phone numbers">
            <FieldDescription>First phone number is treated as  primary phone number, used in most places in your site.</FieldDescription>
            {values.phoneNumbers.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={p.key}
                  onChange={(e) => setPhone(i, { key: e.target.value })}
                  placeholder="Label (e.g. Office)"
                  className="w-40"
                />
                <Input
                  value={p.value}
                  onChange={(e) => setPhone(i, { value: e.target.value })}
                  placeholder="+977 61456078"
                />
                <RemoveBtn
                  onClick={() =>
                    set({
                      phoneNumbers: values.phoneNumbers.filter((_, j) => j !== i),
                    })
                  }
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                set({ phoneNumbers: [...values.phoneNumbers, { key: "", value: "" }] })
              }
            >
              <Plus className="mr-1 h-4 w-4" /> Add phone number
            </Button>
          </Field>
        </Section>

        <Section title="Address">
          <Field label="Full address">
            <FieldDescription className="text-rose-400 text-xs">Full address will override the details filled below in separate address fields.</FieldDescription>
            <Input
              value={values.fullAddress}
              onChange={(e) => set({ fullAddress: e.target.value })}
              placeholder="Street, City, Country"
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="City">
              <Input
                value={values.address.city}
                onChange={(e) =>
                  set({ address: { ...values.address, city: e.target.value } })
                }
              />
            </Field>
            <Field label="Street">
              <Input
                value={values.address.street}
                onChange={(e) =>
                  set({ address: { ...values.address, street: e.target.value } })
                }
              />
            </Field>
            <Field label="District">
              <Input
                value={values.address.district}
                onChange={(e) =>
                  set({ address: { ...values.address, district: e.target.value } })
                }
              />
            </Field>
            <Field label="Country">
              <Input
                value={values.address.country}
                onChange={(e) =>
                  set({ address: { ...values.address, country: e.target.value } })
                }
              />
            </Field>
            <Field label="Postal code">
              <Input
                value={values.address.postalCode}
                onChange={(e) =>
                  set({
                    address: { ...values.address, postalCode: e.target.value },
                  })
                }
              />
            </Field>
          </div>
        </Section>

        <Section title="Social media">
          <FieldTitle className="text-muted-foreground text-xs">Use text based name for platform names like &apos;facebook&apos; for Facebook, and &apos;tiktok&apos; for TikTok.</FieldTitle>
          {values.socials.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={s.platform}
                onChange={(e) => setSocial(i, { platform: e.target.value })}
                placeholder="instagram"
                className="w-40"
              />
              <Input
                value={s.url}
                onChange={(e) => setSocial(i, { url: e.target.value })}
                placeholder="https://instagram.com/yourusername"
              />
              <RemoveBtn
                onClick={() =>
                  set({ socials: values.socials.filter((_, j) => j !== i) })
                }
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              set({ socials: [...values.socials, { platform: "", url: "" }] })
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Add social link
          </Button>
        </Section>

        <SaveBar
          saving={saving}
          onDiscard={() => config && setValues(sliceFrom(config))}
        />
      </form>
    </>
  );
}
