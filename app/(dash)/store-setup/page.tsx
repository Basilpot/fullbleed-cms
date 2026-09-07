"use client";

import { Rocket } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type FormValues = {
  name: string;
  email: string;
  phone: string;
  address: string;
  tagline: string;
};

const empty: FormValues = {
  name: "",
  email: "",
  phone: "",
  address: "",
  tagline: "",
};

export default function StoreSetupPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormValues>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/site-config", { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const c = data?.data;
        if (c) {
          setForm({
            name: c.name ?? "",
            email: c.email ?? "",
            phone: c.whatsAppNumber ?? "",
            address: c.fullAddress ?? "",
            tagline: c.description ?? "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function update(field: keyof FormValues) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/site-config", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          whatsAppNumber: form.phone,
          fullAddress: form.address,
          description: form.tagline,
        }),
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.message || "Something went wrong. Please try again.");
        return;
      }
      toast.success("Store settings saved");
      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8 flex items-center gap-3">
        <Rocket className="size-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Store setup</h1>
          <p className="text-sm text-muted-foreground">
            Basic details for your storefront. You can change these later.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">Store name</FieldLabel>
            <Input
              id="name"
              placeholder="Tasche"
              required
              value={form.name}
              onChange={update("name")}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="email">Contact email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="hello@store.com"
                required
                value={form.email}
                onChange={update("email")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="phone">Phone</FieldLabel>
              <Input
                id="phone"
                type="tel"
                placeholder="+977 98xxxxxxx"
                value={form.phone}
                onChange={update("phone")}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="address">Address</FieldLabel>
            <Input
              id="address"
              placeholder="08 New Rd, Pokhara, Nepal"
              value={form.address}
              onChange={update("address")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="tagline">Tagline</FieldLabel>
            <FieldDescription>
              A short line shown on your storefront.
            </FieldDescription>
            <Textarea
              id="tagline"
              rows={2}
              placeholder="Everyday essentials, one store away."
              value={form.tagline}
              onChange={update("tagline")}
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save & continue"}
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
