"use client";

import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { BlockMenu } from "./block-menu";

interface DragHandleWrapperProps {
  editor: Editor;
}

interface HoveredNode {
  node: PMNode;
  pos: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dragHandle: {
      lockDragHandle: () => ReturnType;
      unlockDragHandle: () => ReturnType;
      toggleDragHandle: () => ReturnType;
    };
  }
}

export function DragHandleWrapper({ editor }: DragHandleWrapperProps) {
  const [hoveredNode, setHoveredNode] = useState<HoveredNode | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const handleRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!hoveredNode) return;

      editor.chain().setNodeSelection(hoveredNode.pos).run();
      setMenuAnchor(handleRef.current);
      setMenuOpen(true);
      editor.commands.lockDragHandle();
    },
    [editor, hoveredNode],
  );

  const handleCloseMenu = useCallback(() => {
    setMenuOpen(false);
    setMenuAnchor(null);
    editor.commands.unlockDragHandle();
  }, [editor]);

  const handleNodeChange = useCallback(
    (data: { node: PMNode | null; editor: Editor; pos: number }) => {
      if (data.node) {
        setHoveredNode({ node: data.node, pos: data.pos });
      } else if (!menuOpen) {
        setHoveredNode(null);
      }
    },
    [menuOpen],
  );

  const computePositionConfig = useMemo(
    () => ({
      placement: "left-start" as const,
      strategy: "absolute" as const,
    }),
    [],
  );

  return (
    <>
      <DragHandle
        editor={editor}
        onNodeChange={handleNodeChange}
        computePositionConfig={computePositionConfig}
      >
        <button
          ref={handleRef}
          type="button"
          className={cn(
            "flex items-center justify-center",
            "w-6 h-6 rounded select-none",
            "text-muted-foreground/50 hover:text-muted-foreground",
            "hover:bg-muted cursor-grab active:cursor-grabbing",
            "transition-colors duration-100",
            menuOpen && "text-muted-foreground bg-muted",
          )}
          onClick={handleClick}
          data-block-handle
          aria-label="Block actions - drag to reorder, click for menu"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </DragHandle>

      <BlockMenu
        editor={editor}
        anchorElement={menuAnchor}
        isOpen={menuOpen}
        onClose={handleCloseMenu}
      />
    </>
  );
}
