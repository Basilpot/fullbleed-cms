"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isVerified] = useState(() => {
    const tabSession = sessionStorage.getItem("tab_session_active");
    if (!tabSession) {
      router.push("/login");
      return false;
    }
    return true;
  });

  if (!isVerified) return null;

  return <>{children}</>;
}
