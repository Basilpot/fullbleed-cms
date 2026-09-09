import { marked } from "marked";

export function renderDocs(markdown: string): string {
  const html = marked.parse(markdown) as string;
  return html.replace(/href="\.\/([\w-]+)\.md(#.*)?"/g, (_match, slug: string, anchor?: string) =>
    `href="/docs/${slug.toLowerCase()}${anchor ?? ""}"`,
  );
}