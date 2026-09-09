"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Inquiry = { id: string; name: string; email: string; phone?: string; subject?: string; message: string; status: string; created_at: string };

export default function InquiriesPage() {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [error, setError] = useState<string | null>(null);
  async function update(id: string, status: string) {
    const response = await fetch(`/api/inquiries/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    if (!response.ok) return toast.error("Could not update inquiry");
    setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    toast.success("Inquiry updated");
  }
  async function remove(id: string) {
    if (!window.confirm("Delete this inquiry?")) return;
    const response = await fetch(`/api/inquiries/${id}`, { method: "DELETE" });
    if (!response.ok) return toast.error("Could not delete inquiry");
    setItems((current) => current.filter((item) => item.id !== id));
    toast.success("Inquiry deleted");
  }
  useEffect(() => { fetch("/api/inquiries").then(async (response) => { if (!response.ok) throw new Error("Inquiry list API not connected"); return response.json(); }).then((payload) => setItems(payload.data ?? [])).catch((reason) => setError(reason.message)); }, []);
  return <div className="space-y-6"><PageHeader title="Inquiries" description="Messages received from client websites." /><Card><CardContent className="p-0">{error ? <p className="p-6 text-sm text-muted-foreground">{error}</p> : items.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No inquiries yet.</p> : <div className="divide-y">{items.map((item) => <article className="space-y-2 p-6" key={item.id}><div className="flex flex-wrap justify-between gap-3"><h2 className="font-medium">{item.subject || "Website inquiry"}</h2><time className="text-sm text-muted-foreground">{new Date(item.created_at).toLocaleString()}</time></div><p className="text-sm">{item.name} · {item.email}{item.phone ? ` · ${item.phone}` : ""}</p><p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.message}</p><div className="flex gap-2 pt-2"><Select value={item.status} onValueChange={(status) => update(item.id, status)}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="read">Read</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent></Select><Button variant="secondary" onClick={() => remove(item.id)}>Delete</Button></div></article>)}</div>}</CardContent></Card></div>;
}
