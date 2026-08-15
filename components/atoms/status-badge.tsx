import { LucideLoader, LucideCheck, LucideX } from "lucide-react";

export function formatStatus(stat: string) {
  if (stat == "DRAFT") {
    return {
      text: "Draft",
      icon: <LucideLoader size={12} />,
      color: "bg-orange-400",
    };
  }
  if (stat == "PUBLISHED") {
    return {
      text: "Published",
      icon: <LucideCheck />,
      color: "bg-green-500",
    };
  }
  if (stat == "REJECTED") {
    return {
      text: "Rejected",
      icon: <LucideX />,
      color: "bg-red-500",
    };
  }
}
