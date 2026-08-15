"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowRight, Trash2, Plus } from "lucide-react";

interface Redirect {
  id: string;
  from: string;
  to: string;
  permanent: boolean;
}

const API_BASE = `/api/redirect`;

function sanitizePath(value: string): string {
  return value.replace(/[^a-zA-Z0-9\-/]/g, "");
}

function wouldCreateCycle(
  redirects: Redirect[],
  newFrom: string,
  newTo: string,
): boolean {
  const map = new Map<string, string>();
  for (const r of redirects) {
    if (r.from !== newFrom) map.set(r.from, r.to);
  }
  map.set(newFrom, newTo);

  // Walk the chain starting from newTo; if we ever land back on newFrom it's a cycle
  const visited = new Set<string>();
  let current = newTo;

  while (map.has(current)) {
    if (current === newFrom) return true;
    if (visited.has(current)) break;
    visited.add(current);
    current = map.get(current)!;
  }
  return current === newFrom;
}

export default function RedirectsManager() {
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchRedirects = async () => {
    const res = await fetch(API_BASE);
    const json = await res.json();
    setRedirects(json.data ?? []);
  };

  useEffect(() => {
    fetchRedirects();
  }, []);

  const handleSave = async () => {
    const trimmedFrom = from.trim();
    const trimmedTo = to.trim();

    if (!trimmedFrom || !trimmedTo) {
      toast.error("Both fields are required");
      return;
    }

    if (trimmedFrom === trimmedTo) {
      toast.error("From and To paths cannot be the same");
      return;
    }

    if (wouldCreateCycle(redirects, trimmedFrom, trimmedTo)) {
      toast.error("This redirect would create a circular loop");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(API_BASE, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: trimmedFrom,
          to: trimmedTo,
          permanent: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success(json.message);
      setFrom("");
      setTo("");
      await fetchRedirects();
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success(json.message);
      setRedirects((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center  px-4">
      <div className="w-full  space-y-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-zinc-950 text-3xl font-bold tracking-tight">
            Redirects
          </h1>
          <p className="text-zinc-500  mt-1">
            Add or update URL redirects. Redirects are automatically apllied
            when the page or activity slug is changed. If something needs manual
            intervention that can be changed manually here.
          </p>
        </div>

        {/* Input Row */}
        <div className="flex gap-3 items-center">
          <Input
            placeholder="/from-path"
            value={from}
            onChange={(e) => setFrom(sanitizePath(e.target.value))}
            className="h-11 flex-1 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <ArrowRight className="shrink-0" size={18} />
          <Input
            placeholder="/to-path"
            value={to}
            onChange={(e) => setTo(sanitizePath(e.target.value))}
            className="h-11 flex-1 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <Button
            onClick={handleSave}
            disabled={loading}
            className="h-11 px-5 shrink-0 font-medium rounded-xl"
          >
            <Plus size={16} className="mr-1" />
            Save
          </Button>
        </div>

        {/* Divider */}
        <div className="border-t  pt-2" />

        {/* Redirect List */}
        {redirects.length === 0 ? (
          <div className="text-center py-16 text-zinc-400 text-sm">
            No redirects yet. Add one above.
          </div>
        ) : (
          <div className="space-y-1">
            {redirects.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 px-2 py-3 group rounded-lg hover:bg-zinc-50 transition-colors"
              >
                <span className="text-zinc-700 text-sm truncate flex-1">
                  {r.from}
                </span>
                <ArrowRight size={14} className="text-zinc-400 shrink-0" />
                <span className="text-zinc-700 text-sm truncate flex-1">
                  {r.to}
                </span>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="shrink-0 ml-2 bg-zinc-950 hover:bg-zinc-700 text-white p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete redirect"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
