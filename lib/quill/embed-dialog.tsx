"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function parseIframe(html: string) {
  const match = html.match(/<iframe\s+[^>]*src=["']([^"']+)["'][^>]*>/i);
  const heightMatch = html.match(/height=["'](\d+)["']/i);
  return {
    src: match?.[1] || html.trim(),
    height: heightMatch ? Number(heightMatch[1]) : 315,
  };
}

export function EmbedDialog({
  open,
  onOpenChange,
  onInsert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (src: string, height: number) => void;
}) {
  const [raw, setRaw] = useState("");
  const [parsedSrc, setParsedSrc] = useState("");
  const [parsedHeight, setParsedHeight] = useState(315);
  const [mode, setMode] = useState<"iframe" | "url">("iframe");

  const handleChange = useCallback((value: string) => {
    setRaw(value);
    const { src, height } = parseIframe(value);
    setParsedSrc(src);
    setParsedHeight(height);
  }, []);

  const handleInsert = () => {
    if (!parsedSrc.trim()) return;
    onInsert(parsedSrc.trim(), parsedHeight);
    setRaw("");
    setParsedSrc("");
    setParsedHeight(315);
    onOpenChange(false);
  };

  const valid = parsedSrc.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Insert Embed</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex gap-2">
            <Button
              variant={mode === "iframe" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("iframe")}
            >
              Paste iframe code
            </Button>
            <Button
              variant={mode === "url" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("url")}
            >
              Enter URL
            </Button>
          </div>

          {mode === "iframe" ? (
            <div className="grid gap-2">
              <Label htmlFor="embed-raw">Paste iframe HTML</Label>
              <Textarea
                id="embed-raw"
                placeholder={'<iframe src="https://www.youtube.com/embed/..." height="315" frameborder="0"></iframe>'}
                value={raw}
                onChange={(e) => handleChange(e.target.value)}
                rows={4}
                autoFocus
              />
              {parsedSrc && raw !== parsedSrc && (
                <p className="text-xs text-muted-foreground">
                  Detected src: {parsedSrc}
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="embed-url">URL</Label>
              <Input
                id="embed-url"
                placeholder="https://www.youtube.com/embed/..."
                value={mode === "url" ? raw : ""}
                onChange={(e) => handleChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && valid && handleInsert()}
                autoFocus
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="embed-height">Height (px)</Label>
            <Input
              id="embed-height"
              type="number"
              min={50}
              max={2000}
              value={parsedHeight}
              onChange={(e) => setParsedHeight(Number(e.target.value))}
            />
          </div>
        </div>
        <DialogFooter showCloseButton>
          <Button onClick={handleInsert} disabled={!valid}>
            Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
