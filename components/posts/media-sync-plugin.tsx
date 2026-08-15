"use client";

import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/core";

/**
 * Syncs image metadata from the media API into the editor's Image nodes.
 * Runs once on mount, then on subsequent editor updates (deduped).
 */
export function useMediaSync(editor: Editor | null) {
  const synced = useRef(false);

  useEffect(() => {
    if (!editor) return;

    const syncNodes = () => {
      if (synced.current) return;

      const imageNodes: { pos: number; mediaId: string }[] = [];

      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "image" && node.attrs.mediaId) {
          imageNodes.push({ pos, mediaId: node.attrs.mediaId as string });
        }
      });

      if (imageNodes.length === 0) {
        synced.current = true;
        return;
      }

      const ids = [...new Set(imageNodes.map((n) => n.mediaId))];

      fetch("/api/media/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
        .then((res) => res.json())
        .then((result) => {
          const map = result.data as Record<
            string,
            { alt: string | null; title: string | null; caption: string | null }
          >;

          editor.chain().command(({ tr }) => {
            for (const { pos, mediaId } of imageNodes) {
              const fresh = map[mediaId];
              if (!fresh) continue;
              const node = tr.doc.nodeAt(pos);
              if (node && node.type.name === "image") {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  alt: fresh.alt || "",
                  title: fresh.title || "",
                  caption: fresh.caption || "",
                });
              }
            }
            return true;
          }).run();
        })
        .catch(() => {
          // silently fail — stale metadata is acceptable fallback
        })
        .finally(() => {
          synced.current = true;
        });
    };

    syncNodes();
  }, [editor]);
}
