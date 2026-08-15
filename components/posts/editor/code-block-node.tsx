"use client";

import CodeBlock from "@tiptap/extension-code-block";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CODE_LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "html",
  "css",
  "json",
  "bash",
  "sql",
  "markdown",
  "rust",
  "go",
  "java",
  "c",
  "cpp",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "yaml",
  "toml",
  "xml",
  "graphql",
  "dockerfile",
  "plaintext",
];

function CodeBlockNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const language = typeof node.attrs.language === "string" ? node.attrs.language : "";

  return (
    <NodeViewWrapper className={`group relative my-4 ${selected ? "ring-2 ring-primary ring-offset-2 rounded-lg" : ""}`}>
      <div className="absolute -top-3 end-2 z-10" contentEditable={false}>
        <Select
          value={language || "plaintext"}
          onValueChange={(val) => updateAttributes({ language: val || null })}
        >
          <SelectTrigger className="h-7 w-[120px] text-xs" size="sm">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            {CODE_LANGUAGES.map((lang) => (
              <SelectItem key={lang} value={lang} className="text-xs">
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <pre className="tiptap-code-block">
        <NodeViewContent />
      </pre>
    </NodeViewWrapper>
  );
}

export const CodeBlockExtension = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockNodeView);
  },
});
