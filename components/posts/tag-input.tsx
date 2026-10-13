"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tag = { id: string; name: string };

const split = (value: string) =>
  value.split(",").map((tag) => tag.trim()).filter(Boolean);

// Tags are stored on the post as a comma-separated string of names (the API
// creates any tag it hasn't seen). Pick existing tags or type a new one and
// press Enter / comma.
export function TagInput({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = useMemo(() => split(value), [value]);
  const [available, setAvailable] = useState<Tag[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    fetch("/api/tags?limit=100", { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => setAvailable(payload?.data?.tags ?? []))
      .catch(() => {});
  }, []);

  const lower = new Set(selected.map((tag) => tag.toLowerCase()));
  const term = query.trim();
  const suggestions = available
    .filter((tag) => !lower.has(tag.name.toLowerCase()))
    .filter((tag) => tag.name.toLowerCase().includes(term.toLowerCase()))
    .slice(0, 8);
  const exact = available.some((tag) => tag.name.toLowerCase() === term.toLowerCase());
  const canCreate = Boolean(term) && !exact && !lower.has(term.toLowerCase());
  const options = [...suggestions.map((tag) => tag.name), ...(canCreate ? [term] : [])];

  function add(name: string) {
    const clean = name.replace(/,/g, "").trim();
    if (!clean || lower.has(clean.toLowerCase())) return;
    onChange([...selected, clean].join(", "));
    setQuery("");
    setHighlight(0);
  }

  function remove(name: string) {
    onChange(selected.filter((tag) => tag !== name).join(", "));
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      const pick = options[highlight] ?? term;
      if (pick) add(pick);
    } else if (event.key === "Backspace" && !query && selected.length) {
      remove(selected[selected.length - 1]);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => Math.max(index - 1, 0));
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <div
        className="flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-2 py-1 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50"
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                remove(tag);
              }}
              className="rounded-sm opacity-60 hover:opacity-100"
              aria-label={`Remove tag ${tag}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          id={id}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          placeholder={selected.length ? "" : "Add tags…"}
          className="h-7 min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          role="combobox"
          aria-controls={listId}
          aria-expanded={open && options.length > 0}
          aria-autocomplete="list"
        />
      </div>
      {open && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-md"
        >
          {options.map((name, index) => {
            const isNew = canCreate && index === options.length - 1;
            return (
              <li
                key={`${isNew ? "new:" : ""}${name}`}
                role="option"
                aria-selected={index === highlight}
                // mousedown, not click: fires before the input's blur closes the list
                onMouseDown={(event) => {
                  event.preventDefault();
                  add(name);
                }}
                onMouseEnter={() => setHighlight(index)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5",
                  index === highlight && "bg-accent text-accent-foreground",
                )}
              >
                {isNew ? (
                  <>
                    <Plus className="size-3.5" /> Create “{name}”
                  </>
                ) : (
                  name
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
