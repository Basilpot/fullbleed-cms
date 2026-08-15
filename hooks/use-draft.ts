"use client";

import { useEffect, useRef, useCallback } from "react";

const DRAFT_PREFIX = "draft-";

function getDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setDraft<T>(key: string, data: T) {
  try {
    localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(data));
  } catch {
    /* quota exceeded or unavailable */
  }
}

function removeDraft(key: string) {
  try {
    localStorage.removeItem(DRAFT_PREFIX + key);
  } catch {
    /* ignore */
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDraft<T = any>(
  draftKey: string,
  {
    getValues,
    delay = 500,
    onRestore,
  }: {
    getValues: () => T;
    delay?: number;
    onRestore?: (data: T) => void;
  },
) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const restoredRef = useRef(false);

  const save = useCallback(() => {
    try {
      setDraft(draftKey, getValues());
    } catch {
      /* ignore */
    }
  }, [draftKey, getValues]);

  const clear = useCallback(() => {
    removeDraft(draftKey);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, [draftKey]);

  const debouncedSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(save, delay);
  }, [save, delay]);

  useEffect(() => {
    if (restoredRef.current) return;
    restoreTimerRef.current = setTimeout(() => {
      const draft = getDraft<T>(draftKey);
      if (draft && onRestore) {
        onRestore(draft);
      }
      restoredRef.current = true;
    }, 0);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  const warnBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = "";
  }, []);

  useEffect(() => {
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [warnBeforeUnload]);

  return { save, clear, debouncedSave };
}
