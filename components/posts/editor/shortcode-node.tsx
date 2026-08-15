"use client";

import type { NodeViewProps } from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { Mountain, List, FileText, Trash2 } from "lucide-react";

type ShortcodeKind = "trip" | "featured-trips" | "post";

interface ShortcodeAttrs {
  kind: ShortcodeKind;
  slug: string;
  tag: string;
  count: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    shortcode: {
      insertShortcode: (options: {
        kind: ShortcodeKind;
        slug?: string;
        tag?: string;
        count?: number;
      }) => ReturnType;
    };
  }
}

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    shortcode: {
      insertShortcode: (options: {
        kind: ShortcodeKind;
        slug?: string;
        tag?: string;
        count?: number;
      }) => ReturnType;
    };
  }
}

function shortcodeText(attrs: ShortcodeAttrs): string {
  switch (attrs.kind) {
    case "trip":
      return `[trip slug="${attrs.slug}"]`;
    case "post":
      return `[post slug="${attrs.slug}"]`;
    case "featured-trips":
      return `[featured-trips tag="${attrs.tag}" count="${attrs.count}"]`;
  }
}

const KIND_META: Record<ShortcodeKind, { label: string; hint: string; icon: typeof Mountain }> = {
  trip: { label: "Trip Embed", hint: "Slug of the trek to embed", icon: Mountain },
  "featured-trips": { label: "Featured Trips", hint: "Featured tag + count", icon: List },
  post: { label: "Post Embed", hint: "Slug of the blog post to embed", icon: FileText },
};

function ShortcodeNodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const attrs = node.attrs as ShortcodeAttrs;
  const meta = KIND_META[attrs.kind] ?? KIND_META.trip;
  const Icon = meta.icon;

  return (
    <NodeViewWrapper
      contentEditable={false}
      className={`not-prose group relative my-4 rounded-lg border bg-muted/40 p-3 ${
        selected ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span>{meta.label}</span>
        <span className="text-xs font-normal text-muted-foreground">— {meta.hint}</span>
        <button
          type="button"
          className="ms-auto h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => deleteNode()}
          title="Remove embed"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        {(attrs.kind === "trip" || attrs.kind === "post") && (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            slug
            <input
              type="text"
              value={attrs.slug}
              onChange={(e) => updateAttributes({ slug: e.target.value })}
              placeholder={attrs.kind === "trip" ? "everest-base-camp-trek" : "post-slug"}
              className="h-7 w-56 rounded-md border bg-background px-2 text-xs text-foreground"
            />
          </label>
        )}
        {attrs.kind === "featured-trips" && (
          <>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              tag
              <input
                type="text"
                value={attrs.tag}
                onChange={(e) => updateAttributes({ tag: e.target.value })}
                placeholder="top-rated"
                className="h-7 w-40 rounded-md border bg-background px-2 text-xs text-foreground"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              count
              <input
                type="number"
                min={1}
                max={12}
                value={attrs.count}
                onChange={(e) => updateAttributes({ count: Number(e.target.value) || 4 })}
                className="h-7 w-14 rounded-md border bg-background px-2 text-xs text-foreground"
              />
            </label>
          </>
        )}
      </div>

      <div className="mt-2 font-mono text-xs text-muted-foreground">{shortcodeText(attrs)}</div>
    </NodeViewWrapper>
  );
}

export const ShortcodeExtension = Node.create({
  name: "shortcode",

  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      kind: { default: "trip" },
      slug: { default: "" },
      tag: { default: "" },
      count: { default: 4 },
    };
  },

  parseHTML() {
    return [
      {
        tag: "p[data-shortcode]",
        getAttrs: (el) => {
          const node = el as HTMLElement;
          return {
            kind: (node.getAttribute("data-shortcode") as ShortcodeKind) || "trip",
            slug: node.getAttribute("data-slug") || "",
            tag: node.getAttribute("data-tag") || "",
            count: Number(node.getAttribute("data-count")) || 4,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = HTMLAttributes as ShortcodeAttrs;
    return [
      "p",
      mergeAttributes(this.options.HTMLAttributes, {
        "data-shortcode": attrs.kind,
        "data-slug": attrs.slug,
        "data-tag": attrs.tag,
        "data-count": String(attrs.count),
      }),
      shortcodeText(attrs),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ShortcodeNodeView);
  },

  addCommands() {
    return {
      insertShortcode:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
