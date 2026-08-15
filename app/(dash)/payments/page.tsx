"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";

const PAYMENT_STATUSES = ["PENDING", "SUCCESS", "FAILED", "REFUNDED"] as const;

const statusStyles: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  SUCCESS: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  REFUNDED: "bg-purple-100 text-purple-800",
};

export default function PaymentList() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [page, setPage] = useState<number>(
    Number(searchParams.get("page") ?? "1"),
  );
  const [limit, setLimit] = useState<number>(
    Number(searchParams.get("limit") ?? "10"),
  );
  const [status, setStatus] = useState<string>(searchParams.get("status") ?? "all");
  const [pagination, setPagination] = useState<any>();

  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      const search = searchParams.get("search");
      if (search) params.set("search", search);
      if (status && status !== "all") params.set("status", status);
      const res = await fetch(`/api/payments?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPayments(data.data.payments);
      setPagination(data.data.pagination);
    } catch {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(Number(searchParams.get("page") ?? "1"));
    setLimit(Number(searchParams.get("limit") ?? "10"));
    setStatus(searchParams.get("status") ?? "all");
  }, [searchParams]);

  useEffect(() => {
    fetchPayments();
  }, [page, limit, status, searchParams.get("search")]);

  const openViewDialog = (payment: any) => {
    setSelectedPayment(payment);
    setIsViewDialogOpen(true);
  };

  const columns: ColumnDef<any, any>[] = [
    {
      header: "Order #",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.order?.orderNumber || "-"}</span>
      ),
    },
    {
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.order?.name || "-"}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.order?.email || ""}
          </p>
        </div>
      ),
    },
    {
      header: "Amount",
      cell: ({ row }) =>
        `NPR ${Number(row.original.amount).toLocaleString()}`,
    },
    {
      header: "Currency",
      cell: ({ row }) => row.original.currency,
    },
    {
      header: "Status",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <Badge className={statusStyles[row.original.status] || "bg-gray-100"}>
            {row.original.status}
          </Badge>
          {row.original.status === "PENDING" && (
            <p className="text-xs text-muted-foreground">
              Payment not received — customer may have abandoned checkout
            </p>
          )}
        </div>
      ),
    },
    {
      header: "Transaction ID",
      cell: ({ row }) => row.original.transactionId || "-",
    },
    {
      header: "Provider",
      cell: ({ row }) => row.original.provider,
    },
    {
      header: "Date",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <Button size="lg" onClick={() => openViewDialog(row.original)}>
          <Eye size={12} />
        </Button>
      ),
    },
  ];

  const statusFilter = (
    <Select
      value={status}
      onValueChange={(v) => {
        const params = new URLSearchParams(searchParams.toString());
        if (v === "all") params.delete("status");
        else params.set("status", v);
        params.set("page", "1");
        router.push(`?${params.toString()}`, { scroll: false });
      }}
    >
      <SelectTrigger className="h-9 w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All statuses</SelectItem>
        {PAYMENT_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div>
      <div className="mb-6">
        <PageHeader
          title="Payments"
          description="All payment transactions across your store"
        />
      </div>

      <DataTable
        columns={columns}
        data={payments}
        isLoading={loading}
        pagination={pagination}
        searchPlaceholder="Search by order #, name or email…"
        emptyMessage="No payments found"
        toolbar={statusFilter}
      />

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              Payment #{selectedPayment?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Order</p>
                  <p className="font-medium">
                    {selectedPayment.order?.orderNumber || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">
                    {selectedPayment.order?.name || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium break-all">
                    {selectedPayment.order?.email || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium">
                    NPR {Number(selectedPayment.amount).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Currency</p>
                  <p className="font-medium">{selectedPayment.currency}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Provider</p>
                  <p className="font-medium">{selectedPayment.provider}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={statusStyles[selectedPayment.status]}>
                    {selectedPayment.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transaction ID</p>
                  <p className="font-medium break-all">
                    {selectedPayment.transactionId || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {new Date(selectedPayment.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              {selectedPayment.status === "PENDING" && (
                <p className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                  This payment is still pending. If the order is still{" "}
                  PENDING_PAYMENT, the customer likely abandoned checkout before
                  completing payment.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
