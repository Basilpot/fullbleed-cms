"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import Link from "next/link";

type FormValues = {
  email: string;
  password: string;
};

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const { register, handleSubmit } = useForm<FormValues>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(data: FormValues) {
    try {
      setIsLoading(true);
      const res = await fetch(
        `/api/auth/login`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          cache: "no-store",
        },
      );

      const payload = await res.json().catch(() => ({}));

      if (res.ok) {
        toast.success("Login successful");
        sessionStorage.setItem("tab_session_active", "true");
        router.push(next ?? "/dashboard");
      } else {
        const msg = payload?.message || "Login failed";
        toast.error(msg);
      }
    } catch (err) {
      console.error("Admin login error:", err);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      {...props}
      onSubmit={handleSubmit(onSubmit)}
      className={cn("flex w-full max-w-sm flex-col gap-6", className)}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Sign in to your Fullbleed workspace
        </p>
      </div>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="m@example.com"
            required
            {...register("email")}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            {...register("password")}
          />
        </Field>
        <Field>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </Field>
      </FieldGroup>
      <p className="text-center text-sm text-muted-foreground">
        New to Fullbleed?{" "}
        <Link
          className="text-foreground underline underline-offset-4"
          href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
        >
          Create a workspace
        </Link>
      </p>
    </form>
  );
}