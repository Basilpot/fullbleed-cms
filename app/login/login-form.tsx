"use client";

import { UserCog } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FormValues = {
  email: string;
  password: string;
};

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
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
    <div
      className={cn("flex flex-col items-center gap-6 w-full max-w-sm", className)}
      {...props}
    >
      <Card className="w-full">
        <CardHeader className="flex flex-col items-center gap-2 text-center pb-2">
          <Link
            href="/"
            className="flex flex-col items-center gap-2 font-medium"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-foreground text-background">
              <UserCog className="size-5" />
            </div>
            <span className="sr-only">Fullbleed</span>
          </Link>
          <CardTitle className="text-xl">Login to your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
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
                  required
                  {...register("password")}
                />
              </Field>
              <Field>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Login"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            New to Fullbleed? <Link className="text-primary underline" href="/signup">Create workspace</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
