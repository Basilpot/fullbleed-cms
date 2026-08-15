import { toast } from "sonner";
import { redirect } from "next/navigation";

export const logout = async () => {
  const res = await fetch(`/api/logout`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    toast.error("Logout failed. Please try again.");
    throw new Error("Failed to logout");
  }
  toast.success("Successfully logged out.");
  redirect("/login");
};
