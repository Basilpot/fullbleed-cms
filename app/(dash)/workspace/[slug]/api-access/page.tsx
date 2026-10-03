"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";

type ApiKey = { id: string; prefix: string; created_at: string; revoked_at: string | null };

const REVOKE_PHRASE = "revoke api";

export default function ApiAccessPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [created, setCreated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const canRevoke = confirmText.trim().toLowerCase() === REVOKE_PHRASE;

  async function create() {
    const response = await fetch("/api/keys", { method: "POST" });
    if (!response.ok) return toast.error("Could not create API key");
    const { data } = (await response.json()) as { data: { id: string; prefix: string; created_at: string; revoked_at: string | null; key: string } };
    setCreated(data.key);
    setKeys((current) => [{ id: data.id, prefix: data.prefix, created_at: data.created_at, revoked_at: null }, ...current]);
    toast.success("API key created");
  }

  function closeRevoke() {
    setRevoking(null);
    setConfirmText("");
  }

  async function revoke(id: string) {
    const response = await fetch(`/api/keys/${id}/revoke`, { method: "POST" });
    if (!response.ok) return toast.error("Could not revoke API key");
    setKeys((current) => current.map((key) => key.id === id ? { ...key, revoked_at: new Date().toISOString() } : key));
    closeRevoke();
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
    <div className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden="true" />
      <div className="space-y-1 text-sm">
        <p className="font-medium text-amber-900">Treat API keys like passwords</p>
        <p className="text-muted-foreground">
          Anyone holding a key can read your published content and submit inquiries as this
          workspace. Revoking is permanent and there is no undo, so rotate keys you suspect are
          exposed. Prefer proxying requests through your own server rather than shipping the key
          in browser code.
        </p>
      </div>
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
                : <Button variant="secondary" onClick={() => { setRevoking(key); setConfirmText(""); }}>Revoke</Button>}
            </div>
          ))}
        </div>}
      </CardContent>
    </Card>
    <Dialog open={!!revoking} onOpenChange={(open) => !open && closeRevoke()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke API key</DialogTitle>
          <DialogDescription>
            Any connected sites using this key will stop receiving data. Their requests start
            failing with <span className="font-mono text-xs">401 Unauthorized</span> as soon as you
            revoke, and the key cannot be restored.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="revoke-confirm">
            Type <span className="font-mono font-semibold text-foreground">{REVOKE_PHRASE}</span> to confirm
          </Label>
          <Input
            id="revoke-confirm"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder={REVOKE_PHRASE}
            autoComplete="off"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeRevoke}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={!canRevoke}
            onClick={() => revoking && revoke(revoking.id)}
          >
            Revoke key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}