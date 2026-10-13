"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Edit3, GripVertical, LucidePlus, Plus, Trash2Icon, X } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { MediaPicker } from "@/components/media-picker";
import { getFullImageUrl } from "@/lib/getFullImageUrl";
import { cn } from "@/lib/utils";

type TeamMember = {
  id: string;
  name: string;
  role: string;
  profession: string;
  qualification: string;
  description: string;
  license: string;
  image: string;
  position: number;
};

type TeamForm = Omit<TeamMember, "id" | "image" | "position">;

const EMPTY: TeamForm = {
  name: "",
  role: "",
  profession: "",
  qualification: "",
  description: "",
  license: "",
};

const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

const dash = <span className="text-muted-foreground">—</span>;

function TeamRow({
  member,
  index,
  onEdit,
  onDelete,
}: {
  member: TeamMember;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: member.id });
  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(isDragging && "relative z-10 bg-background shadow-md")}
    >
      <TableCell className="w-10">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="flex size-8 cursor-grab touch-none items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing"
          aria-label={`Reorder ${member.name}`}
        >
          <GripVertical className="size-4" />
        </button>
      </TableCell>
      <TableCell className="w-10 tabular-nums text-muted-foreground">{index + 1}</TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          {member.image ? (
            <Image
              src={getFullImageUrl(member.image)}
              width={40}
              height={40}
              alt={`${member.name}'s photo`}
              className="size-10 rounded-sm object-cover"
              unoptimized
            />
          ) : (
            <div className="size-10 rounded-sm border" />
          )}
          <button
            type="button"
            onClick={onEdit}
            className="cursor-pointer text-left font-medium hover:underline"
          >
            {member.name}
          </button>
        </div>
      </TableCell>
      <TableCell>{member.role}</TableCell>
      <TableCell>{member.profession || dash}</TableCell>
      <TableCell>{member.license || dash}</TableCell>
      <TableCell>
        <div className="flex gap-4">
          <Button size="lg" onClick={onEdit}>
            <Edit3 size={12} /> Edit
          </Button>
          <Button size="lg" variant="secondary" onClick={onDelete}>
            <Trash2Icon size={12} /> Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// Public staff profiles shown on the website (served at /api/v1/team, in the
// order set here). Dashboard accounts live on the Members page.
export default function Team() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // One unpaginated list: reordering needs every member on screen. The API
  // caps a page at 100, plenty for a team page.
  const fetchTeam = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/team?limit=100", {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setTeam(json?.data ?? []);
    } catch {
      toast.error("Failed to load team");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const previous = team;
    const next = arrayMove(
      team,
      team.findIndex((member) => member.id === active.id),
      team.findIndex((member) => member.id === over.id),
    );
    setTeam(next);
    const res = await fetch("/api/team/order", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids: next.map((member) => member.id) }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      toast.error(json?.message || "Couldn't save the new order");
      setTeam(previous);
      if (res.status === 409) fetchTeam();
    }
  };

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

      <div className="overflow-hidden rounded-md border">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[verticalOnly]}
          onDragEnd={onDragEnd}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <span className="sr-only">Reorder</span>
                </TableHead>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Profession</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {loading ? "Loading…" : "No team members yet."}
                  </TableCell>
                </TableRow>
              ) : (
                <SortableContext items={team.map((member) => member.id)} strategy={verticalListSortingStrategy}>
                  {team.map((member, index) => (
                    <TeamRow
                      key={member.id}
                      member={member}
                      index={index}
                      onEdit={() => openEdit(member)}
                      onDelete={() => setDeleting(member)}
                    />
                  ))}
                </SortableContext>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>
      {team.length > 1 && (
        <p className="mt-3 text-sm text-muted-foreground">
          # is the position on your website (1 shows first). Drag the handle to move someone; the new positions save right away.
        </p>
      )}

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
              <Label htmlFor="team-description">Description (optional)</Label>
              <Textarea
                id="team-description"
                rows={5}
                placeholder="Short bio shown on the website"
                {...register("description")}
              />
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
