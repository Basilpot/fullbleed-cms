"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Shield, ShieldCheck, Mail } from "lucide-react";

type Member = { id: string; name: string; email: string; imageUrl: string | null; role: "owner" | "editor"; createdAt: string };
type Invitation = { id: string; email: string; role: string; expiresAt: string; acceptedAt: string | null; createdAt: string };

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch(`/api/members`, { credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data?.error || "Failed to load members");
      return;
    }
    setMembers(data?.data?.members ?? []);
    setInvitations(data?.data?.invitations ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetch(`/api/members`, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load members");
        setMembers(data?.data?.members ?? []);
        setInvitations(data?.data?.invitations ?? []);
      })
      .catch((e: any) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    const res = await fetch(`/api/members`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    const payload = await res.json();
    if (!res.ok) {
      toast.error(payload?.error || "Invite failed");
      return;
    }
    const token = payload?.data?.token;
    if (token) {
      const link = `${window.location.origin}/invite/${token}`;
      await navigator.clipboard.writeText(link);
      toast.success("Invite created. Link copied to clipboard.");
    }
    setInviteEmail("");
    load();
  }

  async function setRole(member: Member, role: "owner" | "editor") {
    const res = await fetch(`/api/members/${member.id}`, {
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
    const res = await fetch(`/api/members/${member.id}`, { method: "DELETE", credentials: "include" });
    const payload = await res.json();
    if (!res.ok) {
      toast.error(payload?.error || "Failed to remove member");
      return;
    }
    toast.success("Member removed");
    load();
  }

  async function revokeInvite(invitation: Invitation) {
    const res = await fetch(`/api/members/invitations/${invitation.id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      toast.error("Failed to revoke invite");
      return;
    }
    toast.success("Invite revoked");
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Members" description="People with access to this workspace" />

      <form onSubmit={invite} className="flex flex-wrap items-end gap-3 rounded-xl border p-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="invite-email">Invite by email</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="teammate@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="min-w-64"
          />
        </div>
        <Button type="submit" className="ml-auto">
          <Mail /> Send invite
        </Button>
      </form>

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

      {invitations.length > 0 && (
        <div className="rounded-xl border">
          <div className="border-b px-4 py-3 text-sm font-medium">Pending invitations</div>
          <ul className="divide-y">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <ShieldCheck className="size-5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate">{invitation.email}</div>
                  <div className="text-sm text-muted-foreground">
                    {invitation.acceptedAt ? "Accepted" : `Expires ${new Date(invitation.expiresAt).toLocaleDateString()}`}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => revokeInvite(invitation)}>
                  <Trash2 /> Revoke
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}