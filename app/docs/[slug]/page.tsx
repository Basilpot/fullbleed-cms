import { notFound } from "next/navigation";
import { renderDocs } from "@/lib/server/docs-render";
import dashboard from "@/docs/dashboard.md?raw";
import publicApi from "@/docs/public-api.md?raw";
import selfHosting from "@/docs/self-hosting.md?raw";
import architecture from "@/docs/ARCHITECTURE.md?raw";

const PAGES: Record<string, string> = {
  dashboard,
  "public-api": publicApi,
  "self-hosting": selfHosting,
  architecture,
};

export default async function DocsSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = PAGES[slug];
  if (!body) notFound();
  return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderDocs(body) }} />;
}