"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Edit3, LucidePlus, Plus, Trash2Icon, X } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { DataTable, type TPagination } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { MediaPicker } from "@/components/media-picker";
import { getFullImageUrl } from "@/lib/getFullImageUrl";

type TeamMember = {
  id: string;
  name: string;
  role: string;
  profession: string;
  qualification: string;
  description: string;
  license: string;
  image: string;
};

type TeamForm = Omit<TeamMember, "id" | "image">;

const EMPTY: TeamForm = {
  name: "",
  role: "",
  profession: "",
  qualification: "",
  description: "",
  license: "",
};

// Public staff profiles shown on the website (served at /api/v1/team).
// Dashboard accounts live on the Members page.
export default function Team() {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "10");

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<TPagination>();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleting, setDeleting] = useState<TeamMember | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TeamForm>({ defaultValues: EMPTY });

  const fetchTeam = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/team?page=${page}&limit=${limit}`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setTeam(json?.data ?? []);
      setPagination(json?.pagination);
    } catch {
      toast.error("Failed to load team");
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const openCreate = () => {
    setEditing(null);
    setImage(null);
    reset(EMPTY);
    setSheetOpen(true);
  };

  const openEdit = (member: TeamMember) => {
    setEditing(member);
    setImage(member.image || null);
    reset({
      name: member.name,
      role: member.role,
      profession: member.profession,
      qualification: member.qualification,
      description: member.description,
      license: member.license,
    });
    setSheetOpen(true);
  };

  const onSubmit = async (data: TeamForm) => {
    const res = await fetch(editing ? `/api/team/${editing.id}` : "/api/team", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...data, image: image ?? "" }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(json?.message || "Something went wrong");
      return;
    }
    toast.success(editing ? "Team member updated" : "Team member added");
    setSheetOpen(false);
    fetchTeam();
  };

  const deleteMember = async () => {
    if (!deleting) return;
    const res = await fetch(`/api/team/${deleting.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      toast.error("Failed to delete team member. Try again later.");
      return;
    }
    toast.success("Team member removed");
    setDeleting(null);
    fetchTeam();
  };

  const columns: ColumnDef<TeamMember>[] = [
    {
      header: "Member",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.image ? (
            <Image
              src={getFullImageUrl(row.original.image)}
              width={40}
              height={40}
              alt={`${row.original.name}'s photo`}
              className="size-10 rounded-sm object-cover"
              unoptimized
            />
          ) : (
            <div className="size-10 rounded-sm border" />
          )}
          <button
            type="button"
            onClick={() => openEdit(row.original)}
            className="cursor-pointer text-left font-medium hover:underline"
          >
            {row.original.name}
          </button>
        </div>
      ),
    },
    { accessorKey: "role", header: "Role" },
    {
      header: "Profession",
      cell: ({ row }) => row.original.profession || <span className="text-muted-foreground">—</span>,
    },
    {
      header: "License",
      cell: ({ row }) => row.original.license || <span className="text-muted-foreground">—</span>,
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-4">
          <Button size="lg" onClick={() => openEdit(row.original)}>
            <Edit3 size={12} /> Edit
          </Button>
          <Button size="lg" variant="secondary" onClick={() => setDeleting(row.original)}>
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
          title="Team"
          description="Team profiles shown on your website. These are not dashboard accounts — manage those under Members."
        >
          <Button size="lg" onClick={openCreate}>
            <LucidePlus className="mr-2" size={18} />
            Add Team Member
          </Button>
        </PageHeader>
      </div>

      <DataTable
        columns={columns}
        data={team}
        isLoading={loading}
        pagination={pagination}
        searchable={false}
        emptyMessage="No team members yet."
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit Team Member" : "Add Team Member"}</SheetTitle>
            <SheetDescription>
              Fields marked optional can be left blank.
            </SheetDescription>
          </SheetHeader>

          <form
            id="team-form"
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
          >
            <div className="space-y-2">
              <Label>Photo (optional)</Label>
              {image ? (
                <div className="relative size-32 overflow-hidden rounded-md border">
                  <Image
                    src={getFullImageUrl(image)}
                    alt="Photo preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => setImage(null)}
                    className="absolute right-1 top-1 z-10 rounded-full bg-primary/90 p-1 text-background"
                    aria-label="Remove photo"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="flex size-32 shrink-0 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
                >
                  <Plus className="mb-1 size-5" />
                  <span className="text-xs font-medium">Add Media</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-name">Name</Label>
              <Input id="team-name" {...register("name", { required: "Name is required" })} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-role">Role</Label>
              <Input
                id="team-role"
                placeholder="e.g. Founder, Head of Clinic"
                {...register("role", { required: "Role is required" })}
              />
              {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="team-profession">Profession (optional)</Label>
                <Input id="team-profession" placeholder="e.g. Dentist" {...register("profession")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-license">License (optional)</Label>
                <Input id="team-license" placeholder="e.g. NMC 12345" {...register("license")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-qualification">Qualification (optional)</Label>
              <Input id="team-qualification" placeholder="e.g. BDS, MDS" {...register("qualification")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-description">Description</Label>
              <Textarea
                id="team-description"
                rows={5}
                placeholder="Short bio shown on the website"
                {...register("description", { required: "Description is required" })}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>
          </form>

          <SheetFooter>
            <Button type="submit" form="team-form" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : editing ? "Save Changes" : "Add"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Remove ${deleting?.name ?? "team member"}?`}
        description="Their profile disappears from your website. This cannot be undone."
        confirmLabel="Remove"
        pendingLabel="Removing…"
        onConfirm={deleteMember}
      />

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(media) => setImage(media.url)}
      />
    </div>
  );
}
