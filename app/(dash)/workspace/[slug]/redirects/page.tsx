"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Edit3, Plus, Trash2Icon } from "lucide-react";

interface Redirect {
  id: string;
  from: string;
  to: string;
  permanent: boolean;
}

const API_BASE = `/api/redirects`;

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
  const searchParams = useSearchParams();
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Redirect | null>(null);

  const fetchRedirects = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE);
      const json = await res.json();
      setRedirects(json.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRedirects();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setFrom("");
    setTo("");
    setDialogOpen(true);
  };

  const openEdit = (r: Redirect) => {
    setEditingId(r.id);
    setFrom(r.from);
    setTo(r.to);
    setDialogOpen(true);
  };

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

    setSaving(true);
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
      setDialogOpen(false);
      await fetchRedirects();
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success(json.message);
      setRedirects((prev) => prev.filter((r) => r.id !== id));
      setPendingDelete(null);
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    }
  };

  const search = (searchParams.get("search") ?? "").trim().toLowerCase();
  const filteredRedirects = useMemo(
    () =>
      search
        ? redirects.filter(
            (r) =>
              r.from.toLowerCase().includes(search) ||
              r.to.toLowerCase().includes(search),
          )
        : redirects,
    [redirects, search],
  );

  const columns: ColumnDef<Redirect, unknown>[] = [
    {
      id: "sn",
      header: "S.N",
      cell: ({ row }) => row.index + 1,
    },
    {
      accessorKey: "from",
      header: "From",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.from}</span>
      ),
    },
    {
      accessorKey: "to",
      header: "To",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.to}</span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-4">
          <Button size="lg" onClick={() => openEdit(row.original)}>
            <Edit3 size={12} /> Edit
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setPendingDelete(row.original)}
          >
            <Trash2Icon size={12} /> Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <PageHeader
          title="Redirects"
          description="Add or update URL redirects. Redirects are automatically applied when a page or activity slug is changed. If something needs manual intervention that can be changed manually here."
        >
          <Button size="lg" onClick={openCreate}>
            <Plus className="mr-1" size={16} />
            Add Redirect
          </Button>
        </PageHeader>
      </div>

      <DataTable
        data={filteredRedirects}
        columns={columns}
        isLoading={loading}
        searchPlaceholder="Search redirects…"
        emptyMessage="No redirects yet. Add one above."
      />

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Redirect" : "Add Redirect"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-1.5">
              <Label className="font-bold text-sm">From</Label>
              <Input
                value={from}
                onChange={(e) => setFrom(sanitizePath(e.target.value))}
                placeholder="/from-path"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-bold text-sm">To</Label>
              <Input
                value={to}
                onChange={(e) => setTo(sanitizePath(e.target.value))}
                placeholder="/to-path"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Redirect</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the redirect{" "}
              <span className="font-mono">{pendingDelete?.from}</span> →
              <span className="font-mono"> {pendingDelete?.to}</span>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPendingDelete(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleDelete} disabled={saving}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}