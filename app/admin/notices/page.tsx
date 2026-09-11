"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Notice = {
  id: string;
  title: string;
  message: string;
  variant: "info" | "warning" | "error";
  link_url: string | null;
  link_label: string | null;
  active: number;
  starts_at: string | null;
  ends_at: string | null;
};

const emptyForm = { title: "", message: "", variant: "info" as Notice["variant"], linkUrl: "", linkLabel: "", active: true, startsAt: "", endsAt: "" };

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/notices");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || "Failed to load notices");
    setNotices(payload.data.notices);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/admin/notices")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Failed to load notices");
        setNotices(payload.data.notices);
      })
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch(editingId ? `/api/admin/notices/${editingId}` : "/api/admin/notices", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, startsAt: form.startsAt || null, endsAt: form.endsAt || null }),
    });
    const payload = await response.json();
    if (!response.ok) return toast.error(payload?.error || "Failed to save notice");
    toast.success(editingId ? "Notice updated" : "Notice created");
    setEditingId(null);
    setForm(emptyForm);
    await load();
  }

  function edit(notice: Notice) {
    setEditingId(notice.id);
    setForm({
      title: notice.title,
      message: notice.message,
      variant: notice.variant,
      linkUrl: notice.link_url ?? "",
      linkLabel: notice.link_label ?? "",
      active: notice.active === 1,
      startsAt: notice.starts_at?.slice(0, 16) ?? "",
      endsAt: notice.ends_at?.slice(0, 16) ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(notice: Notice) {
    if (!confirm(`Delete notice “${notice.title}”?`)) return;
    const response = await fetch(`/api/admin/notices/${notice.id}`, { method: "DELETE" });
    if (!response.ok) return toast.error("Failed to delete notice");
    toast.success("Notice deleted");
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Notices</h1>
        <p className="text-sm text-muted-foreground">Publish scheduled banners across website.</p>
      </div>

      <form onSubmit={save} className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="variant">Style</Label>
          <Select value={form.variant} onValueChange={(variant: Notice["variant"]) => setForm({ ...form, variant })}>
            <SelectTrigger id="variant"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="message">Message</Label>
          <Textarea id="message" required value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="link-label">Link label</Label>
          <Input id="link-label" value={form.linkLabel} onChange={(event) => setForm({ ...form, linkLabel: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="link-url">Link URL</Label>
          <Input id="link-url" placeholder="/status" value={form.linkUrl} onChange={(event) => setForm({ ...form, linkUrl: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="starts-at">Starts</Label>
          <Input id="starts-at" type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ends-at">Ends</Label>
          <Input id="ends-at" type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm"><Switch checked={form.active} onCheckedChange={(active) => setForm({ ...form, active })} /> Active</label>
        <div className="flex justify-end gap-2">
          {editingId && <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</Button>}
          <Button type="submit">{editingId ? "Save changes" : "Create notice"}</Button>
        </div>
      </form>

      <div className="rounded-xl border">
        {loading ? <p className="p-4 text-sm text-muted-foreground">Loading…</p> : notices.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No notices.</p> : (
          <ul className="divide-y">
            {notices.map((notice) => (
              <li key={notice.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{notice.title} {!notice.active && <span className="text-xs text-muted-foreground">Inactive</span>}</p>
                  <p className="text-sm text-muted-foreground">{notice.message}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => edit(notice)}>Edit</Button>
                <Button variant="destructive" size="sm" onClick={() => remove(notice)}>Delete</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
