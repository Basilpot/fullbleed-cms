import { LucideCheck } from "lucide-react";

export default function ListBox({ list }: { list: string[] }) {
  return (
    <div className="bg-muted p-2 rounded-sm">
      <ul>
        {list.map((item) => (
          <li key={item} className="flex items-center gap-1 text-sm">
            <LucideCheck size={14}  className="text-primary"/>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
