import { renderDocs } from "@/lib/server/docs-render";
import overview from "@/docs/overview.md?raw";

export const metadata = { title: "Fullbleed Docs" };

export default function DocsOverviewPage() {
  return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderDocs(overview) }} />;
}