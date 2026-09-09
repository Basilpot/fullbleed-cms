"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaPicker } from "@/components/media-picker";
import { EmbedDialog } from "@/lib/quill/embed-dialog";
import type { MediaItem } from "@/lib/media";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
  Link2,
  Table2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eye,
  Unlink,
  Plus,
  Columns,
  Rows,
  Trash2,
  Frame,
  ImagePlus,
} from "lucide-react";

import { useEditor, EditorContent, useEditorState, type Editor, type AnyExtension } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import Focus from "@tiptap/extension-focus";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";

import { ImageExtension } from "./editor/image-node";
import { CodeBlockExtension } from "./editor/code-block-node";
import { IframeExtension } from "./editor/iframe-node";
import { ShortcodeExtension } from "./editor/shortcode-node";
import { DragHandleWrapper } from "./editor/drag-handle";
import {
  createSlashCommandsExtension,
  SlashCommandMenu,
  type SlashMenuState,
  type SlashCommandItem,
} from "./editor/slash-commands";
import { useMediaSync } from "./media-sync-plugin";

// ---------------------------------------------------------------------------
// Toolbar UI helpers
// ---------------------------------------------------------------------------
function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-0.5">{children}</div>;
}

function ToolbarSeparator() {
  return <div className="w-px h-6 bg-border mx-1" />;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={`h-8 w-8 p-0 shrink-0 ${active ? "bg-accent text-accent-foreground" : ""}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
      aria-pressed={active}
      tabIndex={0}
    >
      {children}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Editor Toolbar
// ---------------------------------------------------------------------------
function EditorToolbar({
  editor,
  focusMode,
  onFocusModeChange,
}: {
  editor: Editor;
  focusMode: "normal" | "spotlight";
  onFocusModeChange: (mode: "normal" | "spotlight") => void;
}) {
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const fallbackState = {
    isBold: false, isItalic: false, isUnderline: false, isStrike: false,
    isCode: false, isHeading1: false, isHeading2: false, isHeading3: false,
    isBulletList: false, isOrderedList: false, isBlockquote: false,
    isCodeBlock: false, isAlignLeft: false, isAlignCenter: false,
    isAlignRight: false, isLink: false, canUndo: false, canRedo: false,
  };

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      try {
        const e = ctx.editor;
        if (!e) return fallbackState;
        return {
          isBold: e.isActive("bold"),
          isItalic: e.isActive("italic"),
          isUnderline: e.isActive("underline"),
          isStrike: e.isActive("strike"),
          isCode: e.isActive("code"),
          isHeading1: e.isActive("heading", { level: 1 }),
          isHeading2: e.isActive("heading", { level: 2 }),
          isHeading3: e.isActive("heading", { level: 3 }),
          isBulletList: e.isActive("bulletList"),
          isOrderedList: e.isActive("orderedList"),
          isBlockquote: e.isActive("blockquote"),
          isCodeBlock: e.isActive("codeBlock"),
          isAlignLeft: e.isActive({ textAlign: "left" }),
          isAlignCenter: e.isActive({ textAlign: "center" }),
          isAlignRight: e.isActive({ textAlign: "right" }),
          isLink: e.isActive("link"),
          canUndo: e.can().undo(),
          canRedo: e.can().redo(),
        };
      } catch {
        return fallbackState;
      }
    },
  });

  const handleSetLink = () => {
    if (linkUrl.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl.trim() }).run();
    }
    setShowLinkPopover(false);
    setLinkUrl("");
  };

  const handleRemoveLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setShowLinkPopover(false);
    setLinkUrl("");
  };

  const handleLinkKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSetLink();
    } else if (e.key === "Escape") {
      setShowLinkPopover(false);
      setLinkUrl("");
      editor.commands.focus();
    }
  };

  const handleImageSelect = useCallback((media: MediaItem) => {
    editor
      .chain()
      .focus()
      .setImage({
        src: media.url,
        alt: media.alt || undefined,
        title: media.title || undefined,
        caption: media.caption || undefined,
        mediaId: media.id,
      })
      .run();
  }, [editor]);

  const handleEmbedInsert = useCallback((src: string, height: number) => {
    editor
      .chain()
      .focus()
      .setIframeEmbed({ src, height })
      .run();
  }, [editor]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    const buttons = [
      ...toolbar.querySelectorAll<HTMLButtonElement>(
        'button:not([disabled]), [role="button"]:not([disabled])',
      ),
    ];
    const currentIndex = buttons.findIndex((btn) => btn === document.activeElement);
    if (currentIndex === -1) return;
    let nextIndex: number | null = null;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = (currentIndex + 1) % buttons.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = buttons.length - 1;
        break;
      default:
        return;
    }
    if (nextIndex !== null) {
      e.preventDefault();
      buttons[nextIndex]?.focus();
    }
  }, []);

  return (
    <>
      <div
        ref={toolbarRef}
        role="toolbar"
        aria-label="Text formatting"
        className="sticky top-0 z-10 border-b bg-muted/30 p-1 flex flex-wrap gap-0.5"
        onKeyDown={handleKeyDown}
      >
        {/* Text formatting */}
        <ToolbarGroup>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editorState.isBold} title="Bold">
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editorState.isItalic} title="Italic">
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editorState.isUnderline} title="Underline">
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editorState.isStrike} title="Strikethrough">
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editorState.isCode} title="Inline Code">
            <Code className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Headings */}
        <ToolbarGroup>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editorState.isHeading1} title="Heading 1">
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editorState.isHeading2} title="Heading 2">
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editorState.isHeading3} title="Heading 3">
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Lists and blocks */}
        <ToolbarGroup>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editorState.isBulletList} title="Bullet List">
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editorState.isOrderedList} title="Numbered List">
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editorState.isBlockquote} title="Quote">
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editorState.isCodeBlock} title="Code Block">
            <Code className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            active={editor.isActive("table")}
            title="Insert Table"
          >
            <Table2 className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Text alignment */}
        <ToolbarGroup>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editorState.isAlignLeft} title="Align Left">
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editorState.isAlignCenter} title="Align Center">
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editorState.isAlignRight} title="Align Right">
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Insert */}
        <ToolbarGroup>
          {/* Link with inline popover */}
          <div className="relative">
            <ToolbarButton onClick={() => {
              const existingUrl = editor.getAttributes("link").href || "";
              setLinkUrl(existingUrl);
              setShowLinkPopover(true);
              setTimeout(() => linkInputRef.current?.focus(), 0);
            }} active={editorState.isLink} title="Insert Link">
              <Link2 className="h-4 w-4" />
            </ToolbarButton>
            {showLinkPopover && (
              <div className="absolute top-full start-0 mt-1 z-50 rounded-md border bg-popover p-3 shadow-lg">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-muted-foreground">URL</label>
                  <div className="flex items-center gap-1">
                    <Input
                      ref={linkInputRef}
                      type="url"
                      placeholder="https://..."
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      onKeyDown={handleLinkKeyDown}
                      className="h-8 w-52 text-sm"
                    />
                  </div>
                  <div className="flex justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowLinkPopover(false);
                        setLinkUrl("");
                      }}
                    >
                      Cancel
                    </Button>
                    <div className="flex gap-1">
                      {editorState.isLink && (
                        <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={handleRemoveLink}>
                          <Unlink className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      )}
                      <Button type="button" variant="default" size="sm" onClick={handleSetLink}>
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <ToolbarButton onClick={() => setMediaPickerOpen(true)} title="Insert Image">
            <ImagePlus/>
          </ToolbarButton>
          <ToolbarButton onClick={() => setEmbedDialogOpen(true)} title="Embed iframe">
            <Frame className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Insert Horizontal Rule">
            <Minus className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* History */}
        <ToolbarGroup>
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editorState.canUndo} title="Undo">
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editorState.canRedo} title="Redo">
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Focus mode */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => onFocusModeChange(focusMode === "spotlight" ? "normal" : "spotlight")}
            active={focusMode === "spotlight"}
            title={focusMode === "spotlight" ? "Exit Spotlight Mode" : "Spotlight Mode"}
          >
            <Eye className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <MediaPicker
          open={mediaPickerOpen}
          onOpenChange={setMediaPickerOpen}
          onSelect={handleImageSelect}
        />
        <EmbedDialog
          open={embedDialogOpen}
          onOpenChange={setEmbedDialogOpen}
          onInsert={handleEmbedInsert}
        />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Bubble Menu — inline formatting on text selection
// ---------------------------------------------------------------------------
function EditorBubbleMenu({ editor }: { editor: Editor }) {
  const [showLinkInput, setShowLinkInput] = useState(false);

  if (editor.isDestroyed) return null;

  const handleSetLink = (url: string) => {
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
    }
    setShowLinkInput(false);
  };

  const handleRemoveLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setShowLinkInput(false);
  };

  return (
    <BubbleMenu
      editor={editor}
      options={{
        placement: "top",
        offset: 8,
        flip: true,
        shift: true,
      }}
      className="z-[100] flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-lg"
    >
      {showLinkInput ? (
        <BubbleLinkInput
          existingUrl={editor.isActive("link") ? editor.getAttributes("link").href || "" : ""}
          onConfirm={handleSetLink}
          onRemove={editor.isActive("link") ? handleRemoveLink : undefined}
          onCancel={() => setShowLinkInput(false)}
        />
      ) : (
        <>
          <BubbleButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </BubbleButton>
          <BubbleButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </BubbleButton>
          <BubbleButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            title="Underline"
          >
            <UnderlineIcon className="h-4 w-4" />
          </BubbleButton>
          <BubbleButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </BubbleButton>
          <BubbleButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive("code")}
            title="Code"
          >
            <Code className="h-4 w-4" />
          </BubbleButton>
          <div className="w-px h-6 bg-border mx-1" />
          <BubbleButton
            onClick={() => setShowLinkInput(true)}
            active={editor.isActive("link")}
            title={editor.isActive("link") ? "Edit link" : "Add link"}
          >
            <Link2 className="h-4 w-4" />
          </BubbleButton>
        </>
      )}
    </BubbleMenu>
  );
}

function BubbleLinkInput({
  existingUrl,
  onConfirm,
  onRemove,
  onCancel,
}: {
  existingUrl: string;
  onConfirm: (url: string) => void;
  onRemove?: () => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState(existingUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && url.trim()) {
      e.preventDefault();
      onConfirm(url);
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        ref={inputRef}
        type="url"
        placeholder="https://..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        className="h-8 w-48 text-sm"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onConfirm(url)}
        title="Apply link"
      >
        <Link2 className="h-4 w-4" />
      </Button>
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-destructive"
          onClick={onRemove}
          title="Remove link"
        >
          <Minus className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function BubbleButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={`h-8 w-8 p-0 ${active ? "bg-accent text-accent-foreground" : ""}`}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Table Bubble Menu
// ---------------------------------------------------------------------------
function TableBubbleMenu({ editor }: { editor: Editor }) {
  if (editor.isDestroyed) return null;
  if (!editor.isActive("table")) return null;

  return (
    <BubbleMenu
      editor={editor}
      options={{
        placement: "top",
        offset: 8,
      }}
      shouldShow={({ editor: activeEditor }) => activeEditor.isActive("table")}
      className="z-[100] flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-lg"
    >
      <BubbleButton
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        title="Add column before"
      >
        <div className="relative">
          <Columns className="h-4 w-4" />
          <Plus className="absolute -left-0.5 h-2 w-2" />
        </div>
      </BubbleButton>
      <BubbleButton
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        title="Add column after"
      >
        <div className="relative">
          <Columns className="h-4 w-4" />
          <Plus className="absolute -right-0.5 h-2 w-2" />
        </div>
      </BubbleButton>
      <BubbleButton
        onClick={() => editor.chain().focus().deleteColumn().run()}
        title="Delete column"
      >
        <Columns className="h-4 w-4 text-destructive" />
      </BubbleButton>
      <div className="mx-1 h-6 w-px bg-border" />
      <BubbleButton
        onClick={() => editor.chain().focus().addRowBefore().run()}
        title="Add row before"
      >
        <div className="relative">
          <Rows className="h-4 w-4" />
          <Plus className="absolute -top-0.5 h-2 w-2" />
        </div>
      </BubbleButton>
      <BubbleButton
        onClick={() => editor.chain().focus().addRowAfter().run()}
        title="Add row after"
      >
        <div className="relative">
          <Rows className="h-4 w-4" />
          <Plus className="absolute -bottom-0.5 h-2 w-2" />
        </div>
      </BubbleButton>
      <BubbleButton
        onClick={() => editor.chain().focus().deleteRow().run()}
        title="Delete row"
      >
        <Rows className="h-4 w-4 text-destructive" />
      </BubbleButton>
      <div className="mx-1 h-6 w-px bg-border" />
      <BubbleButton
        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
        active={editor.isActive("tableHeader")}
        title="Toggle header row"
      >
        <Table2 className="h-4 w-4" />
      </BubbleButton>
      <BubbleButton
        onClick={() => editor.chain().focus().deleteTable().run()}
        title="Delete table"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </BubbleButton>
    </BubbleMenu>
  );
}

// ---------------------------------------------------------------------------
// Word count / reading time helpers (CJK-aware)
// ---------------------------------------------------------------------------
const WORDS_PER_MINUTE = 200;
const CJK_CHARACTERS_PER_MINUTE = 500;
const CJK_CHARACTER_REGEX =
  /\p{Script=Han}|\p{Script=Hangul}|\p{Script=Hiragana}|\p{Script=Katakana}/gu;

function countCjkCharacters(text: string): number {
  return text.match(CJK_CHARACTER_REGEX)?.length ?? 0;
}

function countNonCjkWords(text: string): number {
  return text.replace(CJK_CHARACTER_REGEX, " ").split(/\s+/).filter(Boolean).length;
}

export function countWords(text: string): number {
  return countNonCjkWords(text) + countCjkCharacters(text);
}

function calculateReadingTime(text: string): number {
  return Math.ceil(
    countNonCjkWords(text) / WORDS_PER_MINUTE +
      countCjkCharacters(text) / CJK_CHARACTERS_PER_MINUTE,
  );
}

// ---------------------------------------------------------------------------
// Editor Footer
// ---------------------------------------------------------------------------
function EditorFooter({ editor }: { editor: Editor }) {
  const { words, characters, text } = useEditorState({
    editor,
    selector: (ctx) => {
      try {
        const e = ctx.editor;
        if (!e) return { words: 0, characters: 0, text: "" };
        const storage = e.storage?.characterCount;
        if (!storage?.words) return { words: 0, characters: 0, text: "" };
        return {
          words: storage.words(),
          characters: storage.characters(),
          text: e.getText(),
        };
      } catch {
        return { words: 0, characters: 0, text: "" };
      }
    },
  });

  const readingTime = calculateReadingTime(text);

  return (
    <div className="border-t px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
      <span>
        {words} {words === 1 ? "word" : "words"}
      </span>
      <span>
        {characters} {characters === 1 ? "character" : "characters"}
      </span>
      <span>{readingTime} min read</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main TipTapEditor component
// ---------------------------------------------------------------------------
export interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  minHeight?: number | string;
  placeholder?: string;
}

let _currentSlashState: SlashMenuState = {
  isOpen: false,
  items: [],
  selectedIndex: 0,
  clientRect: null,
  range: null,
};

export function TipTapEditor({
  content,
  onChange,
  minHeight = 400,
  placeholder = "Start writing...",
}: TipTapEditorProps) {
  const [focusMode, setFocusMode] = useState<"normal" | "spotlight">("normal");
  const [slashMenuState, setSlashMenuState] = useState<SlashMenuState>({
    isOpen: false,
    items: [],
    selectedIndex: 0,
    clientRect: null,
    range: null,
  });

  useEffect(() => {
    _currentSlashState = slashMenuState;
  }, [slashMenuState]);

  const slashExtension = useMemo(
    () =>
      createSlashCommandsExtension({
        onStateChange: setSlashMenuState,
        getState: () => _currentSlashState,
      }),
    [],
  );

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        dropcursor: { color: "#3b82f6", width: 2 },
        codeBlock: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
          HTMLAttributes: { class: "text-primary underline cursor-pointer" },
        },
        underline: {},
      }),
      CodeBlockExtension,
      ImageExtension,
      IframeExtension,
      ShortcodeExtension,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder,
        includeChildren: true,
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      CharacterCount.configure({ wordCounter: countWords }),
      Focus.configure({
        className: "has-focus",
        mode: "all",
      }),
      Typography,
      slashExtension,
    ],
    [slashExtension, placeholder],
  );

  const editorProps = useMemo(
    () => ({
      attributes: {
        class: "tiptap prose prose-sm sm:prose-base max-w-[900px] focus:outline-none min-h-[400px] p-4",
        dir: "auto",
      },
    }),
    [],
  );

  const lastHtmlRef = useRef(content);
  const onChangeRef = useRef(onChange);
  const isInternalChange = useRef(false);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: extensions as AnyExtension[],
    content,
    immediatelyRender: true,
    editorProps,
    onUpdate: ({ editor: updatedEditor }) => {
      if (updatedEditor.isDestroyed) return;
      const html = updatedEditor.getHTML();
      if (html !== lastHtmlRef.current) {
        lastHtmlRef.current = html;
        isInternalChange.current = true;
        onChangeRef.current(html);
      }
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (editor.isDestroyed) return;
    const currentHtml = editor.getHTML();
    if (currentHtml === content) return;
    editor.commands.setContent(content, { emitUpdate: false });
    lastHtmlRef.current = content;
  }, [content, editor]);

  useMediaSync(editor);

  const handleSlashCommand = useCallback(
    (item: SlashCommandItem) => {
      if (editor && slashMenuState.range) {
        item.command({ editor, range: slashMenuState.range });
        setSlashMenuState((prev) => ({ ...prev, isOpen: false }));
      }
    },
    [editor, slashMenuState.range],
  );

  if (!editor) {
    return (
      <div className="border rounded-md flex flex-col overflow-hidden" style={{ height: typeof minHeight === "number" ? `${minHeight}px` : minHeight }}>
        <div className="p-4 text-muted-foreground">Loading editor...</div>
      </div>
    );
  }

  return (
    <div
      className={`border rounded-md flex flex-col overflow-clip ${focusMode === "spotlight" ? "spotlight-mode" : ""}`}
      style={{ minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight }}
    >
      <EditorToolbar
        editor={editor}
        focusMode={focusMode}
        onFocusModeChange={setFocusMode}
      />
      <EditorBubbleMenu editor={editor} />
      <TableBubbleMenu editor={editor} />
      <div className="relative">
        <EditorContent editor={editor} />
        <DragHandleWrapper editor={editor} />
      </div>
      <EditorFooter editor={editor} />
      <SlashCommandMenu
        state={slashMenuState}
        onCommand={handleSlashCommand}
        setSelectedIndex={(index) =>
          setSlashMenuState((prev) => ({ ...prev, selectedIndex: index }))
        }
      />
    </div>
  );
}
