"use client";

import { useEffect } from "react";

// Remembers the open workspace so the next login lands back here. Mirrors
// LAST_WORKSPACE_COOKIE in lib/server/auth.ts (not imported: server-only module).
export function RememberWorkspace({ slug }: { slug: string }) {
  useEffect(() => {
    document.cookie = `fullbleed_workspace=${encodeURIComponent(slug)}; Path=/; Max-Age=${365 * 86_400}; SameSite=Lax`;
  }, [slug]);
  return null;
}
