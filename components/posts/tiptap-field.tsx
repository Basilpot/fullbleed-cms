"use client";

import { Controller } from "react-hook-form";
import { TipTapEditor } from "./tiptap-editor";
import { stripStyles } from "@/lib/stripQuillHTMLStyles";

export function TipTapField({
  name,
  control,
  placeholder,
  minHeight = 350,
  lazy = false,
  isActive = true,
  onActivate,
}: {
  name: string;
  control: any;
  placeholder?: string;
  minHeight?: number;
  lazy?: boolean;
  isActive?: boolean;
  onActivate?: () => void;
}) {
  const editorActive = !lazy || isActive;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) =>
        editorActive ? (
          <TipTapEditor
            content={field.value ?? ""}
            onChange={(html) => {
              const cleaned = stripStyles(html);
              field.onChange(cleaned);
            }}
            minHeight={minHeight}
            placeholder={placeholder}
          />
        ) : (
          <div
            onClick={onActivate}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onActivate?.();
              }
            }}
            tabIndex={0}
            role="textbox"
            className="border rounded-md cursor-pointer overflow-hidden max-w-[900px]"
            style={{ minHeight }}
          >
            <div style={{ overflowWrap: "break-word", wordBreak: "normal" }} className="p-4 overflow-hidden [&_img]:max-w-full [&_img]:h-auto [&_table]:max-w-full [&_iframe]:max-w-full">
              {field.value ? (
                <div dangerouslySetInnerHTML={{ __html: field.value }} />
              ) : (
                <span className="text-muted-foreground">
                  {placeholder || "Click to edit..."}
                </span>
              )}
            </div>
          </div>
        )
      }
    />
  );
}
