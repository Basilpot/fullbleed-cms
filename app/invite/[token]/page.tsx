"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type InviteMeta = {
  email: string;
  role: string;
  expiresAt: string;
  acceptedAt: string | null;
  workspaceName: string;
};

function InviteContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = String(params.token ?? "");
  const [meta, setMeta] = useState<InviteMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    fetch(`/api/members/invitations/${token}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("This invitation is not valid");
        const data = await res.json();
        setMeta(data?.data);
      })
      .catch((e: any) => setError(e.message));
  }, [token]);

  async function accept() {
    setActing(true);
    try {
      const res = await fetch(`/api/members/accept`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Accept failed");
      toast.success(`You joined ${payload?.data?.workspace?.slug}`);
      router.push(`/workspace/${payload?.data?.workspace?.slug}/dashboard`);
    } catch (e: any) {
      if (e.message?.includes("logged in")) {
        router.push(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
      } else {
        toast.error(e.message);
      }
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center gap-6 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">You&apos;re invited</CardTitle>
          <CardDescription>
            {error ?? (meta ? `${meta.email} invited you to the workspace “${meta.workspaceName}” as ${meta.role}.` : "Checking invitation…")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!error && meta && !meta.acceptedAt && (
            <>
              <Button onClick={accept} disabled={acting} className="w-full">
                {acting ? "Joining…" : "Accept invitation"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Already registered?{" "}
                <Link className="text-primary underline" href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>
                  Log out of any other account and log in
                </Link>
              </p>
              <p className="text-center text-xs text-muted-foreground">
                New to Fullbleed? <Link className="text-primary underline" href="/signup">Create an account</Link>
              </p>
            </>
          )}
          {error && (
            <p className="text-center text-sm text-muted-foreground">
              The invitation link is invalid or has expired. Ask the workspace owner to send a new one.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={null}>
      <InviteContent />
    </Suspense>
  );
}