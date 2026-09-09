"use client";
import { StatCard } from "@/components/cards/stat-card";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LucidePackage,
  LucideCheckCircle2,
  LucideClock,
  LucideCircleCheck,
  LucideCircleX,
  LucideBan,
  LucideWallet,
  LucideShoppingBag,
  AlertCircle,
  LucideFileText,
} from "lucide-react";
import { useEffect, useState } from "react";

type Analytics = {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  completedOrders: number;
  failedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
};

export default function Dashboard() {
  const [stats, setStats] = useState<Analytics>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const npr = (v?: number) =>
    v != null ? `NPR ${Number(v).toLocaleString()}` : undefined;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Store overview" />
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
        description="Overview of your store"
      />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          Failed to load analytics: {error}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Products</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Products"
            description="Available in catalog"
            value={stats?.totalProducts}
            icon={LucidePackage}
          />
          <StatCard
            title="Published"
            description="Live on the storefront"
            value={stats?.publishedProducts}
            icon={LucideCheckCircle2}
          />
          <StatCard
            title="Drafts"
            description="Not yet published"
            value={stats?.draftProducts}
            icon={LucideFileText}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Orders</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Orders"
            description="All orders"
            value={stats?.totalOrders}
            icon={LucideShoppingBag}
          />
          <StatCard
            title="Pending Payment"
            description="Awaiting customer payment"
            value={stats?.pendingOrders}
            icon={LucideClock}
          />
          <StatCard
            title="Confirmed"
            description="Paid, ready to fulfil"
            value={stats?.confirmedOrders}
            icon={LucideCircleCheck}
          />
          <StatCard
            title="Completed"
            description="Delivered & closed"
            value={stats?.completedOrders}
            icon={LucideCircleCheck}
          />
          <StatCard
            title="Failed"
            description="Payment failed"
            value={stats?.failedOrders}
            icon={LucideCircleX}
          />
          <StatCard
            title="Cancelled"
            description="Cancelled orders"
            value={stats?.cancelledOrders}
            icon={LucideBan}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Revenue</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Revenue"
            description="Successful payments (NPR)"
            value={npr(stats?.totalRevenue)}
            icon={LucideWallet}
          />
        </div>
      </section>
    </div>
  );
}
