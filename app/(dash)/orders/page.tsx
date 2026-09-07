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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Eye, FileText } from "lucide-react";

const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

const statusStyles: Record<string, string> = {
  PENDING_PAYMENT: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-red-100 text-red-800",
  FAILED: "bg-red-100 text-red-800",
  COMPLETED: "bg-green-100 text-green-800",
};

type OrderItem = {
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type Order = {
  id: number;
  orderNumber: string;
  name: string;
  email: string;
  phone: string | null;
  address?: string | null;
  city?: string | null;
  note?: string | null;
  totalAmount: number;
  currency: string;
  status: string;
  createdAt: string;
  items: OrderItem[];
  payment?: { status: string; transactionId: string | null; amount: number } | null;
};

export default function OrderList() {
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

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      const search = searchParams.get("search");
      if (search) params.set("search", search);
      if (status && status !== "all") params.set("status", status);
      const res = await fetch(`/api/orders?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrders(data.data.orders);
      setPagination(data.data.pagination);
    } catch {
      toast.error("Failed to load orders");
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
    fetchOrders();
  }, [page, limit, status, searchParams.get("search")]);

  const openViewDialog = async (order: Order) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        cache: "no-store",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedOrder(data.data.order);
      }
    } catch {
      // fall back to list row
    }
  };

  const changeStatus = async (id: number, newStatus: string) => {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success("Order status updated");
      fetchOrders();
    } else {
      toast.error(data?.message || "Failed to update order status");
    }
  };

  const completeOrder = async (id: number) => {
    const res = await fetch(`/api/orders/${id}/complete`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success("Order completed");
      fetchOrders();
    } else {
      toast.error(data?.message || "Failed to complete order");
    }
  };

  const columns: ColumnDef<any, any>[] = [
    {
      header: "Order #",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => openViewDialog(row.original)}
          className="font-medium hover:underline cursor-pointer text-left"
        >
          {row.original.orderNumber}
        </button>
      ),
    },
    {
      header: "Name",
      cell: ({ row }) => row.original.name,
    },
    {
      header: "Email",
      cell: ({ row }) => row.original.email,
    },
    {
      header: "Phone",
      cell: ({ row }) => row.original.phone || "-",
    },
    {
      header: "Items",
      cell: ({ row }) => (
        <span className="line-clamp-1 max-w-52">
          {row.original.items
            ?.map((i: OrderItem) => `${i.productName} × ${i.quantity}`)
            .join(", ") || "-"}
        </span>
      ),
    },
    {
      header: "Total",
      cell: ({ row }) =>
        `NPR ${Number(row.original.totalAmount).toLocaleString()}`,
    },
    {
      header: "Status",
      cell: ({ row }) => (
        <Badge className={statusStyles[row.original.status] || "bg-gray-100"}>
          {row.original.status?.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      header: "Date",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button size="lg" onClick={() => openViewDialog(row.original)}>
            <Eye size={12} />
          </Button>
          <Select
            value={row.original.status}
            onValueChange={(v) => changeStatus(row.original.id, v)}
          >
            <SelectTrigger className="h-8 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {row.original.status === "CONFIRMED" && (
            <Button
              size="lg"
              variant="secondary"
              onClick={() => completeOrder(row.original.id)}
            >
              <CheckCircle2 size={12} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <PageHeader
          title="Orders"
          description="All customer orders"
        />
      </div>

      <Tabs
        value={status}
        onValueChange={(v) => {
          const params = new URLSearchParams(searchParams.toString());
          if (v === "all") params.delete("status");
          else params.set("status", v);
          params.set("page", "1");
          router.push(`?${params.toString()}`, { scroll: false });
        }}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          {ORDER_STATUSES.map((s) => (
            <TabsTrigger key={s} value={s}>
              {s.replace(/_/g, " ")}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={orders}
        isLoading={loading}
        pagination={pagination}
        searchPlaceholder="Search by order #, name or email…"
        emptyMessage="No orders found"
      />

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order {selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedOrder.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium break-all">{selectedOrder.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedOrder.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">
                    {selectedOrder.address || "-"}
                    {selectedOrder.city ? `, ${selectedOrder.city}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    className={statusStyles[selectedOrder.status] || "bg-gray-100"}
                  >
                    {selectedOrder.status?.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ordered</p>
                  <p className="font-medium">
                    {new Date(selectedOrder.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-muted-foreground">Items</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items?.map((item: OrderItem, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {item.productName}
                        </TableCell>
                        <TableCell>{item.variantName || "-"}</TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(item.unitPrice).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(item.lineTotal).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-medium">
                        Order total
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        NPR {Number(selectedOrder.totalAmount).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Payment</p>
                  <p className="font-medium">
                    {selectedOrder.payment?.status || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transaction ID</p>
                  <p className="font-medium break-all">
                    {selectedOrder.payment?.transactionId || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paid amount</p>
                  <p className="font-medium">
                    {selectedOrder.payment?.amount != null
                      ? `NPR ${Number(selectedOrder.payment.amount).toLocaleString()}`
                      : "-"}
                  </p>
                </div>
              </div>

              {selectedOrder.note && (
                <div>
                  <p className="text-sm text-muted-foreground">Note</p>
                  <p className="font-medium">{selectedOrder.note}</p>
                </div>
              )}

              <a
                href={`/api/pdf/order?orderId=${selectedOrder.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                <FileText size={14} />
                Download invoice (PDF)
              </a>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            {selectedOrder?.status === "CONFIRMED" && (
              <Button
                variant="secondary"
                onClick={() => {
                  if (selectedOrder) completeOrder(selectedOrder.id);
                  setIsViewDialogOpen(false);
                }}
              >
                Mark completed
              </Button>
            )}
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
