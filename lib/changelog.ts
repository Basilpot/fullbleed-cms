export type ChangelogSection = {
  title: string;
  lines: string[];
};

export function parseChangelog(markdown: string): ChangelogSection[] {
  const sections: ChangelogSection[] = [];
  let current: ChangelogSection | null = null;
  for (const raw of markdown.split("\n")) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      current = { title: line.slice(3).trim(), lines: [] };
      sections.push(current);
    } else if (current && line.trim() !== "" && !line.startsWith("# ")) {
      current.lines.push(line);
    }
  }
  return sections;
}
