import Link from "next/link";
import { Github } from "lucide-react";

export function SiteNav() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Fullbleed
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/docs" className="text-muted-foreground transition-colors hover:text-foreground">
            Docs
          </Link>
          <a
            href="https://github.com/Basilpot/fullbleed-cms"
            target="_blank"
            rel="noreferrer"
            aria-label="Fullbleed on GitHub"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github aria-hidden="true" className="size-5" />
          </a>
        </nav>
      </div>
    </header>
  );
}
