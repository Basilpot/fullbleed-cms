import { Toaster } from "sonner";
import { LoginForm } from "./login-form";
export default function LoginPage() {
  return (
    <div className="bg-background flex min-h-[75vh] flex-col items-center justify-center gap-6 p-6 md:p-10">
      <LoginForm />
      <Toaster />
    </div>
  );
}
