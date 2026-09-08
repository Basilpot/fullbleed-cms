"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

type Inquiry = { id: string; name: string; email: string; phone?: string; subject?: string; message: string; status: string; created_at: string };

export default function InquiriesPage() {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { fetch("/api/inquiries").then(async (response) => { if (!response.ok) throw new Error("Inquiry list API not connected"); return response.json(); }).then((payload) => setItems(payload.data ?? [])).catch((reason) => setError(reason.message)); }, []);
  return <div className="space-y-6"><PageHeader title="Inquiries" description="Messages received from client websites." /><Card><CardContent className="p-0">{error ? <p className="p-6 text-sm text-muted-foreground">{error}</p> : items.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No inquiries yet.</p> : <div className="divide-y">{items.map((item) => <article className="space-y-2 p-6" key={item.id}><div className="flex justify-between"><h2 className="font-medium">{item.subject || "Website inquiry"}</h2><time className="text-sm text-muted-foreground">{new Date(item.created_at).toLocaleString()}</time></div><p className="text-sm">{item.name} · {item.email}{item.phone ? ` · ${item.phone}` : ""}</p><p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.message}</p></article>)}</div>}</CardContent></Card></div>;
}
