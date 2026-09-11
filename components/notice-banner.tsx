"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Notice = {
  id: string;
  title: string;
  message: string;
  variant: "info" | "warning" | "error";
  link_url: string | null;
  link_label: string | null;
};

const variants = {
  info: "bg-primary text-primary-foreground",
  warning: "bg-muted text-foreground",
  error: "bg-destructive text-destructive-foreground",
};

export function NoticeBanner() {
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    fetch("/api/notices/active")
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => setNotices(payload?.data?.notices ?? []))
      .catch(() => undefined);
  }, []);

  if (!notices.length) return null;
  return (
    <aside aria-label="Platform notices">
      {notices.map((notice) => (
        <div key={notice.id} className={`px-4 py-2 text-center text-sm ${variants[notice.variant]}`}>
          <strong>{notice.title}</strong> {notice.message}{" "}
          {notice.link_url && notice.link_label && (
            <Link href={notice.link_url} className="font-medium underline underline-offset-2">{notice.link_label}</Link>
          )}
        </div>
      ))}
    </aside>
  );
}
