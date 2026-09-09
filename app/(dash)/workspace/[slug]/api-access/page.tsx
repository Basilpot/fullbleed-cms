"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ApiKey = { id: string; prefix: string; created_at: string; revoked_at: string | null };

export default function ApiAccessPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [created, setCreated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    const response = await fetch("/api/keys", { method: "POST" });
    if (!response.ok) return toast.error("Could not create API key");
    const { data } = (await response.json()) as { data: { id: string; prefix: string; created_at: string; revoked_at: string | null; key: string } };
    setCreated(data.key);
    setKeys((current) => [{ id: data.id, prefix: data.prefix, created_at: data.created_at, revoked_at: null }, ...current]);
    toast.success("API key created");
  }

  async function revoke(id: string) {
    if (!window.confirm("Revoke this API key? Requests using it will stop working immediately.")) return;
    const response = await fetch(`/api/keys/${id}/revoke`, { method: "POST" });
    if (!response.ok) return toast.error("Could not revoke API key");
    setKeys((current) => current.map((key) => key.id === id ? { ...key, revoked_at: new Date().toISOString() } : key));
    toast.success("API key revoked");
  }

  useEffect(() => {
    fetch("/api/keys").then(async (response) => {
      if (!response.ok) throw new Error("API key list not connected");
      return response.json();
    }).then((payload) => setKeys(((payload as { data?: ApiKey[] }).data) ?? [])).catch((reason) => setError(reason.message));
  }, []);

  return <div className="space-y-6">
    <PageHeader title="API Access" description="Publishable API keys for client websites." />
    <div className="flex justify-between gap-3">
      <p className="max-w-xl text-sm text-muted-foreground">Keys authenticate your public API calls (e.g. inquiry forms). Send them as <code className="rounded bg-muted px-1 py-0.5 text-xs">Authorization: Bearer kb_pub_…</code> from your site.</p>
      <Button onClick={create}>Create API key</Button>
    </div>
    {created && (
      <Card className="border-emerald-600/40">
        <CardContent className="space-y-2 p-6">
          <p className="text-sm font-medium">Key created — copy it now, it won&apos;t be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 text-xs">{created}</code>
            <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(created); toast.success("Copied"); }}>Copy</Button>
          </div>
        </CardContent>
      </Card>
    )}
    <Card>
      <CardContent className="p-0">
        {error ? <p className="p-6 text-sm text-muted-foreground">{error}</p>
        : keys.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No API keys yet.</p>
        : <div className="divide-y">
          {keys.map((key) => (
            <div className="flex flex-wrap items-center justify-between gap-3 p-6" key={key.id}>
              <div>
                <p className="font-mono text-sm">{key.prefix}…</p>
                <p className="text-sm text-muted-foreground">Created {new Date(key.created_at).toLocaleDateString()}{key.revoked_at ? ` · Revoked ${new Date(key.revoked_at).toLocaleDateString()}` : ""}</p>
              </div>
              {key.revoked_at
                ? <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">Revoked</span>
                : <Button variant="secondary" onClick={() => revoke(key.id)}>Revoke</Button>}
            </div>
          ))}
        </div>}
      </CardContent>
    </Card>
  </div>;
}