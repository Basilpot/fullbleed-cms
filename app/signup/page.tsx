"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function submit(form: FormData) {
    setPending(true);
    const response = await fetch("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    const payload = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) return toast.error(payload.message ?? "Could not create workspace");
    router.push("/dashboard");
  }
  return <main className="flex min-h-[75vh] items-center justify-center p-6"><Card className="w-full max-w-md"><CardHeader className="flex flex-col items-center gap-2 text-center pb-2"><Link href="/" className="flex flex-row items-center gap-2 font-medium"><span>Fullbleed</span></Link><CardTitle>Create Fullbleed workspace</CardTitle></CardHeader><CardContent><form action={submit} className="space-y-4"><div><Label htmlFor="name">Your name</Label><Input id="name" name="name" required /></div><div><Label htmlFor="workspaceName">Workspace</Label><Input id="workspaceName" name="workspaceName" required /></div><div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></div><div><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" minLength={12} required /></div><Button className="w-full" disabled={pending}>{pending ? "Creating…" : "Create workspace"}</Button></form><p className="mt-4 text-center text-sm text-muted-foreground">Already have access? <Link className="text-primary underline" href="/login">Login</Link></p></CardContent></Card><Toaster /></main>;
}
