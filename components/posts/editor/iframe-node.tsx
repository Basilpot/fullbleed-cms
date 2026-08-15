"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { Trash2, GripVertical } from "lucide-react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    iframeEmbed: {
      setIframeEmbed: (options: { src: string; height?: number; title?: string }) => ReturnType;
    };
  }
}

function IframeNodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [height, setHeight] = useState(String(node.attrs.height || 315));

  const handleSaveHeight = () => {
    updateAttributes({ height: Number(height) || 315 });
    setIsEditing(false);
  };

  return (
    <NodeViewWrapper
      className={`relative my-4 group ${selected ? "ring-2 ring-primary ring-offset-2 rounded-lg" : ""}`}
      contentEditable={false}
    >
      <div className="relative rounded-lg overflow-hidden border bg-muted/30">
        <iframe
          src={node.attrs.src}
          width="100%"
          height={Number(node.attrs.height) || 315}
          frameBorder="0"
          allowFullScreen
          allow="autoplay; encrypted-media; fullscreen"
          title={node.attrs.title || "Embedded content"}
          className="w-full"
        />

        {selected && (
          <div className="absolute top-2 end-2 flex gap-1">
            <button
              type="button"
              className="h-7 w-7 inline-flex items-center justify-center rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setIsEditing(true)}
              title="Resize"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="h-7 w-7 inline-flex items-center justify-center rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/80 shadow-sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => deleteNode()}
              title="Delete embed"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {isEditing && (
          <div className="absolute bottom-0 start-0 end-0 bg-background/95 backdrop-blur p-3 border-t">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Height (px)</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveHeight();
                  if (e.key === "Escape") setIsEditing(false);
                }}
                className="flex-1 h-8 px-2 text-sm rounded-md border bg-background"
                min={50}
                max={2000}
                autoFocus
              />
              <button
                type="button"
                className="h-8 px-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleSaveHeight}
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const IframeExtension = Node.create({
  name: "iframeEmbed",

  group: "block",

  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      height: { default: 315 },
      title: { default: "Embedded content" },
    };
  },

  parseHTML() {
    return [
      // Match existing Quill format: <div class="ql-embed"><iframe ...></div>
      {
        tag: "div.ql-embed",
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false;
          const iframe = element.querySelector("iframe");
          if (!iframe) return false;
          return {
            src: iframe.getAttribute("src") || null,
            height: iframe.getAttribute("height") ? Number(iframe.getAttribute("height")) : 315,
            title: iframe.getAttribute("title") || "Embedded content",
          };
        },
      },
      // Match our own format: <div class="embed-container"><iframe ...></div>
      {
        tag: "div.embed-container",
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false;
          const iframe = element.querySelector("iframe");
          if (!iframe) return false;
          return {
            src: iframe.getAttribute("src") || null,
            height: iframe.getAttribute("height") ? Number(iframe.getAttribute("height")) : 315,
            title: iframe.getAttribute("title") || "Embedded content",
          };
        },
      },
      // Match bare iframe
      {
        tag: "iframe",
        getAttrs: (element) => {
          if (!(element instanceof HTMLIFrameElement)) return false;
          return {
            src: element.getAttribute("src") || null,
            height: element.getAttribute("height") ? Number(element.getAttribute("height")) : 315,
            title: element.getAttribute("title") || "Embedded content",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, height, title } = HTMLAttributes;
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, { class: "embed-container", contenteditable: "false" }),
      [
        "iframe",
        mergeAttributes({
          src,
          width: "100%",
          height: String(height || 315),
          frameborder: "0",
          allowfullscreen: "true",
          allow: "autoplay; encrypted-media; fullscreen",
          title: title || "Embedded content",
        }),
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(IframeNodeView);
  },

  addCommands() {
    return {
      setIframeEmbed:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { src: options.src, height: options.height, title: options.title },
          });
        },
    };
  },
});
