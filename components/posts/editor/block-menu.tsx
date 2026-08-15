"use client";

import { useFloating, offset, flip, shift, autoUpdate } from "@floating-ui/react";
import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  List,
  ListOrdered,
  Copy,
  Trash2,
  GripVertical,
} from "lucide-react";

interface BlockTransform {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  transform: (editor: Editor) => void;
}

const blockTransforms: BlockTransform[] = [
  {
    id: "paragraph",
    label: "Paragraph",
    icon: Type,
    transform: (editor) => {
      editor.chain().focus().setNode("paragraph").run();
    },
  },
  {
    id: "heading1",
    label: "Heading 1",
    icon: Heading1,
    transform: (editor) => {
      editor.chain().focus().setNode("heading", { level: 1 }).run();
    },
  },
  {
    id: "heading2",
    label: "Heading 2",
    icon: Heading2,
    transform: (editor) => {
      editor.chain().focus().setNode("heading", { level: 2 }).run();
    },
  },
  {
    id: "heading3",
    label: "Heading 3",
    icon: Heading3,
    transform: (editor) => {
      editor.chain().focus().setNode("heading", { level: 3 }).run();
    },
  },
  {
    id: "blockquote",
    label: "Quote",
    icon: Quote,
    transform: (editor) => {
      editor.chain().focus().toggleBlockquote().run();
    },
  },
  {
    id: "codeBlock",
    label: "Code Block",
    icon: Code,
    transform: (editor) => {
      editor.chain().focus().toggleCodeBlock().run();
    },
  },
  {
    id: "bulletList",
    label: "Bullet List",
    icon: List,
    transform: (editor) => {
      editor.chain().focus().toggleBulletList().run();
    },
  },
  {
    id: "orderedList",
    label: "Numbered List",
    icon: ListOrdered,
    transform: (editor) => {
      editor.chain().focus().toggleOrderedList().run();
    },
  },
];

interface BlockMenuProps {
  editor: Editor;
  anchorElement: HTMLElement | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BlockMenu({ editor, anchorElement, isOpen, onClose }: BlockMenuProps) {
  const [showTransforms, setShowTransforms] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const handleCloseMenu = useCallback(() => {
    setShowTransforms(false);
    onClose();
  }, [onClose]);

  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    placement: "left-start",
    middleware: [offset({ mainAxis: 8, crossAxis: 0 }), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    if (anchorElement) {
      refs.setReference(anchorElement);
    }
  }, [anchorElement, refs]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showTransforms) {
          setShowTransforms(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showTransforms, handleCloseMenu]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-block-handle]")) return;
      handleCloseMenu();
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, handleCloseMenu]);

  const handleDuplicate = useCallback(() => {
    if (!(editor.state.selection instanceof NodeSelection)) {
      handleCloseMenu();
      return;
    }
    const { selection, doc } = editor.state;
    const { from, to } = selection;
    const slice = doc.slice(from, to);
    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        tr.insert(to, slice.content);
        return true;
      })
      .run();
    handleCloseMenu();
  }, [editor, handleCloseMenu]);

  const handleDelete = useCallback(() => {
    if (!(editor.state.selection instanceof NodeSelection)) {
      handleCloseMenu();
      return;
    }
    editor.chain().focus().deleteSelection().run();
    handleCloseMenu();
  }, [editor, handleCloseMenu]);

  const handleTransform = useCallback(
    (transform: BlockTransform) => {
      transform.transform(editor);
      handleCloseMenu();
    },
    [editor, handleCloseMenu],
  );

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={(node) => {
        menuRef.current = node;
        refs.setFloating(node);
      }}
      style={floatingStyles}
      className="z-[100] rounded-lg border bg-popover shadow-lg min-w-[180px] overflow-hidden"
    >
      {showTransforms ? (
        <div className="py-1">
          <button
            type="button"
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-start"
            onClick={() => setShowTransforms(false)}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
          <div className="h-px bg-border my-1" />
          {blockTransforms.map((transform) => (
            <button
              key={transform.id}
              type="button"
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-start"
              onClick={() => handleTransform(transform)}
            >
              <transform.icon className="h-4 w-4 text-muted-foreground" />
              <span>{transform.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="py-1">
          <button
            type="button"
            className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-accent text-start"
            onClick={() => setShowTransforms(true)}
          >
            <span className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span>Turn into</span>
            </span>
            <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180" />
          </button>
          <button
            type="button"
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-start"
            onClick={handleDuplicate}
          >
            <Copy className="h-4 w-4 text-muted-foreground" />
            <span>Duplicate</span>
          </button>
          <div className="h-px bg-border my-1" />
          <button
            type="button"
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-start text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
