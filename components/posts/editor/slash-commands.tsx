"use client";

import { Extension, type Range } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { useFloating, offset, flip, shift, autoUpdate } from "@floating-ui/react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Table2,
  FileText,
} from "lucide-react";
import type { Editor } from "@tiptap/core";

export interface SlashCommandItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  aliases?: string[];
  command: (props: { editor: Editor; range: Range }) => void;
}

export interface SlashMenuState {
  isOpen: boolean;
  items: SlashCommandItem[];
  selectedIndex: number;
  clientRect: (() => DOMRect | null) | null;
  range: Range | null;
}

const defaultCommands: SlashCommandItem[] = [
  {
    id: "heading1",
    title: "Heading 1",
    description: "Large section heading",
    icon: Heading1,
    aliases: ["h1", "title"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
    },
  },
  {
    id: "heading2",
    title: "Heading 2",
    description: "Medium section heading",
    icon: Heading2,
    aliases: ["h2", "subtitle"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
    },
  },
  {
    id: "heading3",
    title: "Heading 3",
    description: "Small section heading",
    icon: Heading3,
    aliases: ["h3"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
    },
  },
  {
    id: "bulletList",
    title: "Bullet List",
    description: "Create a bullet list",
    icon: List,
    aliases: ["ul", "unordered"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    id: "numberedList",
    title: "Numbered List",
    description: "Create a numbered list",
    icon: ListOrdered,
    aliases: ["ol", "ordered"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    id: "blockquote",
    title: "Quote",
    description: "Insert a blockquote",
    icon: Quote,
    aliases: ["blockquote", "cite"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    id: "codeBlock",
    title: "Code Block",
    description: "Insert a code block",
    icon: Code,
    aliases: ["code", "pre", "```"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    id: "horizontalRule",
    title: "Divider",
    description: "Insert a horizontal rule",
    icon: Minus,
    aliases: ["hr", "---", "separator"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    id: "table",
    title: "Table",
    description: "Insert a table",
    icon: Table2,
    aliases: ["grid", "spreadsheet"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    id: "postShortcode",
    title: "Post Embed",
    description: "Embed another post by slug",
    icon: FileText,
    aliases: ["post", "embed"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertShortcode({ kind: "post", slug: "" }).run();
    },
  },
];

export function createSlashCommandsExtension(options: {
  commands?: SlashCommandItem[];
  onStateChange: React.Dispatch<React.SetStateAction<SlashMenuState>>;
  getState: () => SlashMenuState;
}) {
  const allCommands = options.commands ?? defaultCommands;

  const filterCommands = (query: string) => {
    if (!query) return allCommands;
    const lower = query.toLowerCase();
    const titleMatches: SlashCommandItem[] = [];
    const otherMatches: SlashCommandItem[] = [];
    for (const item of allCommands) {
      if (item.title.toLowerCase().includes(lower)) {
        titleMatches.push(item);
      } else if (
        item.description.toLowerCase().includes(lower) ||
        item.aliases?.some((alias) => alias.toLowerCase().includes(lower))
      ) {
        otherMatches.push(item);
      }
    }
    return [...titleMatches, ...otherMatches];
  };

  return Extension.create({
    name: "slashCommands",

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          char: "/",
          startOfLine: true,
          command: ({ editor, range, props }) => {
            const item = props as SlashCommandItem;
            item.command({ editor, range });
          },
          items: ({ query }) => filterCommands(query),
          render: () => {
            return {
              onStart: (props) => {
                options.onStateChange({
                  isOpen: true,
                  items: props.items as SlashCommandItem[],
                  selectedIndex: 0,
                  clientRect: props.clientRect ?? null,
                  range: props.range,
                });
              },
              onUpdate: (props) => {
                options.onStateChange((prev) => ({
                  ...prev,
                  items: props.items as SlashCommandItem[],
                  selectedIndex: 0,
                  clientRect: props.clientRect ?? null,
                  range: props.range,
                }));
              },
              onKeyDown: (props) => {
                if (props.event.key === "Escape") {
                  options.onStateChange((prev) => ({ ...prev, isOpen: false }));
                  return true;
                }
                if (props.event.key === "ArrowUp") {
                  options.onStateChange((prev) => ({
                    ...prev,
                    selectedIndex: (prev.selectedIndex - 1 + prev.items.length) % prev.items.length,
                  }));
                  return true;
                }
                if (props.event.key === "ArrowDown") {
                  options.onStateChange((prev) => ({
                    ...prev,
                    selectedIndex: (prev.selectedIndex + 1) % prev.items.length,
                  }));
                  return true;
                }
                if (props.event.key === "Enter") {
                  const state = options.getState();
                  if (state.items.length > 0 && state.range) {
                    const item = state.items[state.selectedIndex];
                    if (item) {
                      item.command({ editor: this.editor, range: state.range });
                      options.onStateChange((prev) => ({ ...prev, isOpen: false }));
                      return true;
                    }
                  }
                  return false;
                }
                return false;
              },
              onExit: () => {
                options.onStateChange((prev) => ({ ...prev, isOpen: false }));
              },
            };
          },
        }),
      ];
    },
  });
}

export function SlashCommandMenu({
  state,
  onCommand,
  setSelectedIndex,
}: {
  state: SlashMenuState;
  onCommand: (item: SlashCommandItem) => void;
  setSelectedIndex: (index: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { refs, floatingStyles } = useFloating({
    open: state.isOpen,
    placement: "bottom-start",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    if (state.clientRect) {
      const clientRectFn = state.clientRect;
      refs.setReference({
        getBoundingClientRect: () => clientRectFn() ?? new DOMRect(),
      });
    }
  }, [state.clientRect, refs]);

  useEffect(() => {
    if (!state.isOpen) return;
    const container = containerRef.current;
    if (!container) return;
    const selected = container.querySelector<HTMLElement>(`[data-index="${state.selectedIndex}"]`);
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [state.selectedIndex, state.isOpen]);

  const hasMouseMovedRef = useRef(false);
  useEffect(() => {
    if (!state.isOpen) {
      hasMouseMovedRef.current = false;
    }
  }, [state.isOpen]);

  if (!state.isOpen) return null;

  return createPortal(
    <div
      ref={(node) => {
        containerRef.current = node;
        refs.setFloating(node);
      }}
      style={floatingStyles}
      className="z-[100] rounded-lg border bg-popover p-1 shadow-lg min-w-[220px] max-h-[300px] overflow-y-auto"
      onPointerMove={() => {
        hasMouseMovedRef.current = true;
      }}
    >
      {state.items.length === 0 ? (
        <p className="text-sm text-muted-foreground px-3 py-2">No results</p>
      ) : (
        state.items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            data-index={index}
            className={`flex items-center gap-3 w-full px-3 py-2 text-sm rounded text-start ${
              index === state.selectedIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            }`}
            onClick={() => onCommand(item)}
            onMouseEnter={() => {
              if (hasMouseMovedRef.current) {
                setSelectedIndex(index);
              }
            }}
          >
            <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium">{item.title}</span>
              <span className="text-xs text-muted-foreground">{item.description}</span>
            </div>
          </button>
        ))
      )}
    </div>,
    document.body,
  );
}
