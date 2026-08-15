"use client";

import type { NodeViewProps } from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useState } from "react";

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        caption?: string;
        mediaId?: string;
      }) => ReturnType;
    };
  }
}

function ImageNodeView({ node, updateAttributes, selected, deleteNode }: NodeViewProps) {
  const [isEditingAlt, setIsEditingAlt] = useState(false);
  const [altText, setAltText] = useState(node.attrs.alt || "");

  if (!isEditingAlt && node.attrs.alt && node.attrs.alt !== altText) {
    setAltText(node.attrs.alt);
  }

  const handleSaveAlt = () => {
    updateAttributes({ alt: altText });
    setIsEditingAlt(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveAlt();
    } else if (e.key === "Escape") {
      setAltText(node.attrs.alt || "");
      setIsEditingAlt(false);
    }
  };

  return (
    <NodeViewWrapper className={`relative my-4 group ${selected ? "ring-2 ring-primary ring-offset-2 rounded-lg" : ""}`} data-media-id={node.attrs.mediaId || undefined}>
      <figure className="relative">
        <img
          src={node.attrs.src}
          alt={node.attrs.alt || ""}
          title={node.attrs.title || ""}
          className="rounded-md max-w-full h-auto mx-auto"
          draggable={false}
        />

        {selected && (
          <div className="absolute top-2 end-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setIsEditingAlt(true)}
              title="Edit alt text"
            >
              ✏️
            </button>
            <button
              type="button"
              className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/80"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => deleteNode()}
              title="Delete image"
            >
              🗑️
            </button>
          </div>
        )}

        {isEditingAlt && (
          <div className="absolute bottom-0 start-0 end-0 bg-background/95 backdrop-blur p-3 rounded-b-lg border-t">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Alt text</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe the image..."
                className="flex-1 h-8 px-2 text-sm rounded-md border bg-background"
                autoFocus
              />
              <button
                type="button"
                className="h-8 px-2 text-sm rounded-md border bg-background hover:bg-muted"
                onClick={() => {
                  setAltText(node.attrs.alt || "");
                  setIsEditingAlt(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="h-8 px-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleSaveAlt}
              >
                Save
              </button>
            </div>
          </div>
        )}

        {!isEditingAlt && (node.attrs.caption || node.attrs.alt) && (
          <figcaption className="text-center text-sm text-muted-foreground mt-2">
            {node.attrs.caption || node.attrs.alt}
          </figcaption>
        )}
      </figure>
    </NodeViewWrapper>
  );
}

export const ImageExtension = Node.create({
  name: "image",

  addOptions() {
    return {
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? "inline" : "block";
  },

  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      caption: { default: null },
      mediaId: { default: null },
    };
  },

  parseHTML() {
    return [
      // Match existing Quill format: <figure data-media-id><img><figcaption></figure>
      {
        tag: "figure[data-media-id]",
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false;
          const img = element.querySelector("img");
          const figcaption = element.querySelector("figcaption");
          return {
            src: img?.getAttribute("src") || null,
            alt: img?.getAttribute("alt") || null,
            title: img?.getAttribute("title") || null,
            caption: figcaption?.textContent || null,
            mediaId: element.getAttribute("data-media-id") || null,
          };
        },
      },
      // Match bare <img> tags
      { tag: "img[src]" },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { mediaId, caption, ...imgAttrs } = HTMLAttributes;
    if (mediaId) {
      return [
        "figure",
        mergeAttributes(this.options.HTMLAttributes, { "data-media-id": mediaId }),
        ["img", mergeAttributes(imgAttrs)],
        ...(caption ? [["figcaption", caption]] : []),
      ];
    }
    return ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },

  addCommands() {
    return {
      setImage:
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
