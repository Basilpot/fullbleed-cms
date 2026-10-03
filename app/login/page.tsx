import { Toaster } from "sonner";
import Link from "next/link";
import { PaperArt } from "@/components/paper-art";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <>
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <Link href="/" className="flex w-fit items-center">
            <img src="/fullbleed-logo.svg" alt="Fullbleed" className="h-8 w-auto" />
          </Link>
          <div className="flex flex-1 items-center justify-center">
            <LoginForm />
          </div>
        </div>
        <div className="relative hidden lg:block">
          <PaperArt />
        </div>
      </div>
      <Toaster />
    </>
  );
}