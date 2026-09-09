import Link from "next/link";

export function SiteNav() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Fullbleed
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/docs" className="text-muted-foreground transition-colors hover:text-foreground">
            Docs
          </Link>
        </nav>
      </div>
    </header>
  );
}