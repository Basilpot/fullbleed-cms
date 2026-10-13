"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Shield, UserPlus, Copy, RefreshCw } from "lucide-react";

type Member = { id: string; name: string; email: string; imageUrl: string | null; role: "owner" | "editor"; createdAt: string };
type Credentials = { name: string; email: string; password: string | null; loginUrl: string };

const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function generatePassword(length = 16) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length]).join("");
}

export default function MembersPage() {
  const params = useParams();
  const slug = String(params.slug ?? "");
  const [members, setMembers] = useState<Member[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState(() => generatePassword());
  const [newRole, setNewRole] = useState<"owner" | "editor">("editor");
  const [adding, setAdding] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [loading, setLoading] = useState(true);

  const membersUrl = useCallback(
    (path = "") => `/api/members${path}${path ? "&" : "?"}workspace=${encodeURIComponent(slug)}`,
    [slug],
  );

  async function load() {
    const res = await fetch(membersUrl(), { credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data?.error || "Failed to load members");
      return;
    }
    setMembers(data?.data?.members ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!slug) return;
    fetch(membersUrl(), { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load members");
        setMembers(data?.data?.members ?? []);
          })
      .catch((e: any) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [slug, membersUrl]);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAdding(true);
    const res = await fetch(membersUrl(), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, email: newEmail, password: newPassword, role: newRole }),
    });
    const payload = await res.json();
    setAdding(false);
    if (!res.ok) {
      toast.error(payload?.error || "Could not add member");
      return;
    }
    const created = Boolean(payload?.data?.created);
    setCredentials({
      name: payload?.data?.name ?? newName,
      email: payload?.data?.email ?? newEmail.trim(),
      password: created ? newPassword : null,
      loginUrl: `${window.location.origin}/login`,
    });
    toast.success(created ? "Account created. Share the login details below." : "Existing account added to this workspace.");
    setNewName("");
    setNewEmail("");
    setNewPassword(generatePassword());
    setNewRole("editor");
    load();
  }

  async function copyCredentials() {
    if (!credentials) return;
    const text = [
      `Login: ${credentials.loginUrl}`,
      `Email: ${credentials.email}`,
      credentials.password ? `Password: ${credentials.password}` : "Password: your existing Fullbleed password",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Login details copied");
    } catch {
      toast.error("Clipboard blocked — copy the details manually");
    }
  }

  async function setRole(member: Member, role: "owner" | "editor") {
    const res = await fetch(membersUrl(`/${member.id}`), {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const payload = await res.json();
    if (!res.ok) {
      toast.error(payload?.error || "Failed to update role");
      return;
    }
    toast.success(`${member.name} is now ${role}`);
    load();
  }

  async function removeMember(member: Member) {
    if (!confirm(`Remove ${member.name} from this workspace?`)) return;
    const res = await fetch(membersUrl(`/${member.id}`), { method: "DELETE", credentials: "include" });
    const payload = await res.json();
    if (!res.ok) {
      toast.error(payload?.error || "Failed to remove member");
      return;
    }
    toast.success("Member removed");
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Members" description="People with access to this workspace" />

      <form onSubmit={addMember} className="flex flex-wrap items-end gap-3 rounded-xl border p-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="member-name">Name</Label>
          <Input id="member-name" placeholder="Jane Doe" value={newName} onChange={(e) => setNewName(e.target.value)} className="min-w-48" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="member-email">Email</Label>
          <Input
            id="member-email"
            type="email"
            required
            placeholder="teammate@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="min-w-64"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="member-password">Password</Label>
          <div className="flex gap-1">
            <Input
              id="member-password"
              minLength={12}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="min-w-48 font-mono"
              autoComplete="off"
            />
            <Button type="button" variant="outline" size="icon" onClick={() => setNewPassword(generatePassword())} aria-label="Generate password">
              <RefreshCw />
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Role</Label>
          <Select value={newRole} onValueChange={(role) => setNewRole(role as "owner" | "editor")}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="ml-auto" disabled={adding}>
          <UserPlus /> {adding ? "Adding…" : "Add member"}
        </Button>
        <p className="w-full text-xs text-muted-foreground">
          Creates the account and adds it to this workspace — no email is sent. If the email already has an account, it is added with its existing password.
        </p>
      </form>

      {credentials && (
        <div className="rounded-xl border border-dashed p-4 text-sm">
          <div className="mb-2 flex items-center gap-2">
            <span className="font-medium">Share these login details with {credentials.name || credentials.email}</span>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={copyCredentials}>
              <Copy /> Copy
            </Button>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-muted px-3 py-2 font-mono text-xs break-all">
            <dt className="text-muted-foreground">Login</dt>
            <dd>{credentials.loginUrl}</dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd>{credentials.email}</dd>
            <dt className="text-muted-foreground">Password</dt>
            <dd>{credentials.password ?? "Their existing password"}</dd>
          </dl>
          {credentials.password && <p className="mt-2 text-xs text-muted-foreground">The password is not shown again once you leave this page.</p>}
        </div>
      )}

      <div className="rounded-xl border">
        <div className="border-b px-4 py-3 text-sm font-medium">Members</div>
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : members.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No members yet.</div>
        ) : (
          <ul className="divide-y">
            {members.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {member.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{member.name}</span>
                    {member.role === "owner" && (
                      <Badge variant="secondary" className="gap-1">
                        <Shield /> Owner
                      </Badge>
                    )}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">{member.email}</div>
                </div>
                <Select value={member.role} onValueChange={(role) => setRole(member, role as "owner" | "editor")}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => removeMember(member)} aria-label={`Remove ${member.name}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}