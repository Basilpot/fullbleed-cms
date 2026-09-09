"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

type Membership = { role: string; workspaceName: string; workspaceSlug: string };
type User = {
  id: string;
  name: string;
  email: string;
  isPlatformAdmin: boolean;
  suspended: boolean;
  createdAt: string;
  memberships: Membership[];
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(q?: string) {
    const params = new URLSearchParams();
    if (q?.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/admin/users?${params}`, { credentials: "include" });
    const payload = await res.json();
    if (!res.ok) {
      toast.error(payload?.error || "Failed to load users");
      setLoading(false);
      return;
    }
    setUsers(payload?.data?.users ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetch(`/api/admin/users`, { credentials: "include" })
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.error || "Failed to load users");
        setUsers(payload?.data?.users ?? []);
      })
      .catch((e: any) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function toggleAdmin(user: User, checked: boolean) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPlatformAdmin: checked }),
    });
    const payload = await res.json();
    if (!res.ok) {
      toast.error(payload?.error || "Failed to update role");
      return;
    }
    toast.success(checked ? `${user.email} is now a platform admin` : "Platform admin revoked");
    load(query);
  }

  async function toggleSuspended(user: User, checked: boolean) {
    const res = await fetch(`/api/admin/users/${user.id}/status`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspended: checked }),
    });
    const payload = await res.json();
    if (!res.ok) {
      toast.error(payload?.error || "Failed to update status");
      return;
    }
    toast.success(checked ? `${user.email} suspended` : `${user.email} unsuspended`);
    load(query);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">Manage access and moderation of all registered accounts.</p>
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            load(query);
          }}
        >
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email" className="w-64" />
          <Button type="submit" size="icon" aria-label="Search">
            <Search />
          </Button>
        </form>
      </div>

      <div className="rounded-xl border">
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : users.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No users found.</div>
        ) : (
          <ul className="divide-y">
            {users.map((user) => (
              <li key={user.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{user.name}</span>
                    {user.suspended && (
                      <Badge variant="destructive">Suspended</Badge>
                    )}
                    {user.isPlatformAdmin && <Badge variant="secondary">Platform admin</Badge>}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">{user.email}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {user.memberships.length
                      ? user.memberships.map((m) => `${m.workspaceName} (${m.role})`).join(", ")
                      : "No workspaces"}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  Suspended
                  <Switch checked={user.suspended} onCheckedChange={(c) => toggleSuspended(user, c)} />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  Admin
                  <Switch checked={user.isPlatformAdmin} onCheckedChange={(c) => toggleAdmin(user, c)} />
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}