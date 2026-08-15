"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Mail, MailOpen, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Subscriber = {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  unsubscribedAt: string | null;
};

const API = "/api";

export function createColumns(onToggle?: () => void): ColumnDef<Subscriber>[] {
  const toggleActive = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/newsletter/${id}/toggle`, {
      method: "PATCH",
      credentials: "include",
    });
    const json = await res.json();
    if (res.ok) {
      toast.success(isActive ? "Unsubscribed" : "Re-subscribed");
      onToggle?.();
    } else {
      toast.error(json?.message || "Failed to toggle");
    }
  };

  return [
    {
      accessorKey: "id",
      header: "SN",
      cell: ({ row }) => <div>{row.index + 1}</div>,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("email")}</span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const active = row.getValue("isActive");
        return active ? (
          <Badge className="bg-green-600">
            <Mail className="mr-1 h-3 w-3" /> Active
          </Badge>
        ) : (
          <Badge variant="secondary">
            <MailOpen className="mr-1 h-3 w-3" /> Inactive
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Subscribed",
      cell: ({ row }) =>
        new Date(row.getValue("createdAt")).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const sub = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await toggleActive(sub.id, sub.isActive);
                }}
              >
                {sub.isActive ? "Unsubscribe" : "Re-subscribe"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
