import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

const NAV = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/dashboard", label: "Dashboard" },
  { href: "/docs/public-api", label: "Public API" },
  { href: "/docs/self-hosting", label: "Self-hosting" },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-x-4 gap-y-1 px-4 py-3 text-sm">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-muted-foreground transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">{children}</main>
    </div>
  );
}