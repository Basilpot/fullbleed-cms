import { readFile } from "fs/promises";
import path from "path";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { parseChangelog } from "@/lib/changelog";

export const dynamic = "force-dynamic";

function Inline({ text }: { text: string }) {
  const parts = text.split("**");
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i}>{part}</strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function SectionBody({ lines }: { lines: string[] }) {
  return (
    <ul className="space-y-2 text-sm text-muted-foreground">
      {lines.map((line, i) => {
        if (line.startsWith("### ")) {
          return (
            <li
              key={i}
              className="pt-2 text-sm font-medium text-foreground"
            >
              <Inline text={line.slice(4)} />
            </li>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <li key={i} className="flex gap-2">
              <span className="text-muted-foreground">-</span>
              <span>
                <Inline text={line.slice(2)} />
              </span>
            </li>
          );
        }
        return (
          <li key={i}>
            <Inline text={line} />
          </li>
        );
      })}
    </ul>
  );
}

export default async function ChangelogPage() {
  const markdown = await readFile(
    path.join(process.cwd(), "CHANGELOG.md"),
    "utf8",
  );
  const sections = parseChangelog(markdown);

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <PageHeader
          title="Changelog"
          description="What's new in the dashboard — maintained in CHANGELOG.md"
        />
      </div>
      <div className="space-y-6">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <SectionBody lines={section.lines} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
