import { cn } from "@/lib/utils";
import { LucideLightbulb } from "lucide-react";

export default function InfoCard({
  title,
  info,
  type = "default",
}: {
  title?: string;
  info: string;
  type?: "warning" | "info" | "danger" | "default";
}) {
  return (
    <div
      className={cn(
        type == "warning"
          ? "border-l-orange-600"
          : type == "danger"
            ? "border-l-red-600"
            : type == "info"
              ? "border-l-blue-600"
              : "",
        "border-l-4 rounded-sm text-sm p-1 rounded-4 bg-muted flex flex-col",
      )}
    >
      <div className="flex gap-1 items-center font-semibold">
        <LucideLightbulb size={16}  /> {title ? title : "Tip"}
      </div>
      <p className="p-2">{info}</p>
    </div>
  );
}
