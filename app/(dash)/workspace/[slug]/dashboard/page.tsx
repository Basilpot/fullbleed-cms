"use client";
import { StatCard } from "@/components/cards/stat-card";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LucideFileText,
  LucideCheckCircle2,
  LucidePenLine,
  LucideNewspaper,
  LucideLayers,
  LucideImage,
  LucideContact2,
  LucideFolder,
  LucideTag,
  AlertCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Analytics = {
  contentTotal: number;
  contentPublished: number;
  contentDraft: number;
  posts: number;
  services: number;
  media: number;
  authors: number;
  categories: number;
  tags: number;
};

export default function Dashboard() {
  const [stats, setStats] = useState<Analytics>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const slug = usePathname().split("/")[2];

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/admin/analytics`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setStats(data?.data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Content overview" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl border p-6 space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your workspace"
      />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          Failed to load analytics: {error}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Content</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Content"
            description="Posts and pages combined"
            value={stats?.contentTotal}
            icon={LucideFileText}
          />
          <StatCard
            title="Published"
            description="Live on your site"
            value={stats?.contentPublished}
            icon={LucideCheckCircle2}
          />
          <StatCard
            title="Drafts"
            description="Not yet published"
            value={stats?.contentDraft}
            icon={LucidePenLine}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Posts & pages</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href={`/workspace/${slug}/posts`} className="contents">
            <StatCard
              title="Posts"
              description="Articles and blog entries"
              value={stats?.posts}
              icon={LucideNewspaper}
            />
          </Link>
          <Link href={`/workspace/${slug}/services`} className="contents">
            <StatCard
              title="Services"
              description="Static pages like about and contact"
              value={stats?.services}
              icon={LucideLayers}
            />
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Library</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href={`/workspace/${slug}/media`} className="contents">
            <StatCard
              title="Media Files"
              description="Uploaded images and documents"
              value={stats?.media}
              icon={LucideImage}
            />
          </Link>
          <Link href={`/workspace/${slug}/authors`} className="contents">
            <StatCard
              title="Authors"
              description="Content contributors"
              value={stats?.authors}
              icon={LucideContact2}
            />
          </Link>
          <Link href={`/workspace/${slug}/categories`} className="contents">
            <StatCard
              title="Categories"
              description="Group content for navigation"
              value={stats?.categories}
              icon={LucideFolder}
            />
          </Link>
          <Link href={`/workspace/${slug}/tags`} className="contents">
            <StatCard
              title="Tags"
              description="Label content for filtering"
              value={stats?.tags}
              icon={LucideTag}
            />
          </Link>
        </div>
      </section>
    </div>
  );
}