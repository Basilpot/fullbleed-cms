"use client";

import { LucideCopy, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import Link from "next/link";
import { PasswordShowHideToggle } from "@/components/molecules/password-show-hide-toggle";
import { siteConfig } from "@/lib/siteConfig";

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
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(data: FormValues) {
    try {
      setIsLoading(true);
      const res = await fetch(
        `/api/admin/login`,
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
        if (payload.token) {
          try {
            localStorage.setItem("admin_token", payload.token);
          } catch (e: any) {
            throw new Error("Error: ", e);
          }
        }
        router.push("/dashboard");
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
      className={cn("flex flex-col gap-6 w-full max-w-sm", className)}
      {...props}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <Link
              href="/"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <UserCog className="size-6" />
              </div>
              <span className="sr-only">Ash and Moss</span>
            </Link>
            <h1 className="text-xl font-bold">Login to your account</h1>
            {process.env.NEXT_PUBLIC_IS_GROWFORE == "true" && (
              <>
                <FieldDescription>
                  Enter below credentials to get access to admin panel.
                </FieldDescription>
              </>
            )}
          </div>
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
          <Field className="relative">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              required
              {...register("password")}
            />
            <div className="absolute bottom-1 left-86">
              <PasswordShowHideToggle inputElementId="password" />
            </div>
          </Field>
          <Field>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Login"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
