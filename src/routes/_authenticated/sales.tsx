import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import {
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
  Printer,
  Smartphone,
  CreditCard,
  Banknote,
  DollarSign,
  TrendingUp,
  User,
  Calendar,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { salesOptions, productsOptions } from "@/lib/salon.queries";
import { cedi, formatDate, PAYMENT_METHODS } from "@/lib/salon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RecordSaleDialog } from "@/components/RecordSaleDialog";
import { useUserRole } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({
    meta: [
      { title: "Sales & Receipts — Heavic Ventures" },
      {
        name: "description",
        content: "Track client sales transactions, receipts, and payment channels.",
      },
      { property: "og:title", content: "Sales & Receipts — Heavic Ventures" },
      {
        property: "og:description",
        content: "Track client sales transactions, receipts, and payment channels.",
      },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(salesOptions),
      context.queryClient.ensureQueryData(productsOptions),
    ]);
  },
  component: SalesPage,
});

type SaleRecord = {
  id: string;
  user_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  customer: string;
  payment_method: string;
  created_at: string;
  staff_name?: string;
  notes?: string;
};

function SalesPage() {
  const qc = useQueryClient();
  const { data: sales } = useSuspenseQuery(salesOptions);
  const { isAdmin } = useUserRole();

  const [search, setSearch] = useState<string>("");
  const [methodFilter, setMethodFilter] = useState<string>("All");
  const [saleDialogOpen, setSaleDialogOpen] = useState<boolean>(false);
  const [selectedReceipt, setSelectedReceipt] = useState<SaleRecord | null>(null);

  // Filtered sales list
  const filteredSales = useMemo(() => {
    return (sales as SaleRecord[]).filter((sale) => {
      const matchesMethod = methodFilter === "All" || sale.payment_method === methodFilter;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        sale.product_name.toLowerCase().includes(q) ||
        sale.customer.toLowerCase().includes(q) ||
        (sale.staff_name && sale.staff_name.toLowerCase().includes(q));
      return matchesMethod && matchesSearch;
    });
  }, [sales, search, methodFilter]);

  // Aggregate stats
  const totalRevenue = useMemo(
    () => filteredSales.reduce((acc, s) => acc + s.quantity * Number(s.unit_price), 0),
    [filteredSales],
  );

  const totalUnitsSold = useMemo(
    () => filteredSales.reduce((acc, s) => acc + s.quantity, 0),
    [filteredSales],
  );

  const avgSaleValue = useMemo(
    () => (filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0),
    [totalRevenue, filteredSales],
  );

  // Delete / Void sale (Admin privilege only)
  const handleDeleteSale = async (sale: SaleRecord) => {
    if (!isAdmin) {
      toast.error("Only Administrators can void or delete sales records.");
      return;
    }

    if (
      !confirm(
        `Void sale for ${sale.quantity}x ${sale.product_name} (${cedi(sale.quantity * Number(sale.unit_price))})? Stock will be restored to inventory.`,
      )
    ) {
      return;
    }

    const { error } = await supabase.from("sales").delete().eq("id", sale.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Sale voided. Inventory stock restored.");
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-3xl uppercase tracking-tight text-secondary">
            Sales & Transaction History
          </h2>
          <p className="text-sm text-muted-foreground">
            Complete audit trail of salon purchases, Mobile Money receipts, and customer sales.
          </p>
        </div>

        <Button
          onClick={() => setSaleDialogOpen(true)}
          className="h-12 rounded-full bg-brand px-6 font-bold text-primary-foreground shadow-brand hover:opacity-95"
        >
          <ShoppingCart className="mr-2 h-4 w-4" /> Record New Sale
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Revenue
            </span>
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 font-heading text-3xl font-extrabold text-secondary">
            {cedi(totalRevenue)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {filteredSales.length} sale transactions
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Units Sold
            </span>
            <div className="rounded-full bg-muted p-2 text-primary">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 font-heading text-3xl font-extrabold text-secondary">
            {totalUnitsSold} Units
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Hair bundles, oils & accessories</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Average Ticket
            </span>
            <div className="rounded-full bg-secondary/10 p-2 text-secondary">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 font-heading text-3xl font-extrabold text-secondary">
            {cedi(avgSaleValue)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Per customer transaction</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Payment Channels
            </span>
            <div className="rounded-full bg-accent/30 p-2 text-secondary">
              <Smartphone className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
              <Smartphone className="h-3.5 w-3.5" /> MoMo
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
              <Banknote className="h-3.5 w-3.5" /> Cash
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600">
              <CreditCard className="h-3.5 w-3.5" /> Card
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">All Ghana payment networks supported</p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by customer, product, or stylist name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 rounded-full bg-card pl-11"
          />
        </div>

        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="h-12 rounded-full bg-card sm:w-52">
            <SelectValue placeholder="Payment Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Payment Methods</SelectItem>
            {PAYMENT_METHODS.map((method) => (
              <SelectItem key={method} value={method}>
                {method}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sales Table */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
        {filteredSales.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Receipt className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <h4 className="font-heading text-xl uppercase text-secondary">
              No Sales Records Found
            </h4>
            <p className="mt-1 text-sm">
              {sales.length === 0
                ? "No sales have been recorded yet."
                : "No transactions match your current search or payment filter."}
            </p>
            <Button
              onClick={() => setSaleDialogOpen(true)}
              className="mt-4 rounded-full bg-brand font-bold text-primary-foreground shadow-brand"
            >
              <ShoppingCart className="mr-2 h-4 w-4" /> Record First Sale
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Transaction / Item</th>
                  <th className="px-4 py-4">Customer</th>
                  <th className="px-4 py-4">Payment Method</th>
                  <th className="px-4 py-4">Stylist / Staff</th>
                  <th className="px-4 py-4 text-right">Qty & Price</th>
                  <th className="px-4 py-4 text-right">Total Amount</th>
                  <th className="px-6 py-4 text-center">Receipt</th>
                  <th className="px-4 py-4 text-center">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredSales.map((sale) => {
                  const lineTotal = sale.quantity * Number(sale.unit_price);
                  return (
                    <tr key={sale.id} className="transition-colors hover:bg-muted/20">
                      <td className="px-6 py-4">
                        <div className="font-bold text-foreground">{sale.product_name}</div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(sale.created_at)}</span>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-medium text-foreground">
                          {sale.customer || "Walk-in Client"}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                            sale.payment_method === "Mobile Money"
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                              : sale.payment_method === "Card"
                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          }`}
                        >
                          {sale.payment_method === "Mobile Money" ? (
                            <Smartphone className="h-3 w-3" />
                          ) : sale.payment_method === "Card" ? (
                            <CreditCard className="h-3 w-3" />
                          ) : (
                            <Banknote className="h-3 w-3" />
                          )}
                          {sale.payment_method}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3 text-secondary" />
                          <span>{sale.staff_name || "Salon Staff"}</span>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="text-xs text-muted-foreground">
                          {sale.quantity}x @ {cedi(Number(sale.unit_price))}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="font-heading text-lg font-bold text-secondary">
                          {cedi(lineTotal)}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedReceipt(sale)}
                          className="h-8 rounded-full border-border bg-card px-3 text-xs font-semibold hover:bg-accent"
                          title="View salon receipt"
                        >
                          <Printer className="mr-1 h-3.5 w-3.5 text-primary" /> Receipt
                        </Button>
                      </td>

                      <td className="px-4 py-4 text-center">
                        {isAdmin ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteSale(sale)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            title="Void sale and restore inventory stock"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span
                            className="inline-flex items-center text-xs text-muted-foreground"
                            title="Admin privileges required to void sales"
                          >
                            <Lock className="h-3.5 w-3.5 opacity-50" />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Sale Dialog */}
      <RecordSaleDialog open={saleDialogOpen} onClose={() => setSaleDialogOpen(false)} />

      {/* Receipt Viewer Modal */}
      {selectedReceipt && (
        <Dialog open={!!selectedReceipt} onOpenChange={(o) => !o && setSelectedReceipt(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader className="text-center">
              <div className="mx-auto mb-2 font-display text-3xl text-primary">
                Heavic <span className="text-accent">Ventures</span>
              </div>
              <DialogTitle className="font-heading text-xl uppercase tracking-tight text-secondary">
                Official Salon Receipt
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Heavic Ventures Hair & Beauty Studio · Accra, Ghana
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 space-y-3 rounded-xl border border-dashed p-4 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Receipt No:</span>
                <span className="font-mono font-bold text-foreground">
                  HV-{selectedReceipt.id.slice(-6).toUpperCase()}
                </span>
              </div>

              <div className="flex justify-between text-muted-foreground">
                <span>Date & Time:</span>
                <span className="font-medium text-foreground">
                  {formatDate(selectedReceipt.created_at)}
                </span>
              </div>

              <div className="flex justify-between text-muted-foreground">
                <span>Client Name:</span>
                <span className="font-medium text-foreground">
                  {selectedReceipt.customer || "Walk-in Client"}
                </span>
              </div>

              <div className="flex justify-between text-muted-foreground">
                <span>Stylist / Cashier:</span>
                <span className="font-medium text-foreground">
                  {selectedReceipt.staff_name || "Salon Staff"}
                </span>
              </div>

              <div className="border-t border-dashed my-2 pt-2">
                <div className="flex justify-between font-bold text-foreground">
                  <span>{selectedReceipt.product_name}</span>
                  <span>{cedi(selectedReceipt.quantity * Number(selectedReceipt.unit_price))}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {selectedReceipt.quantity} unit(s) x {cedi(Number(selectedReceipt.unit_price))}
                </div>
              </div>

              <div className="border-t border-dashed my-2 pt-2">
                <div className="flex justify-between text-sm font-extrabold text-secondary">
                  <span>TOTAL PAID:</span>
                  <span className="font-heading text-lg">
                    {cedi(selectedReceipt.quantity * Number(selectedReceipt.unit_price))}
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-muted-foreground">
                  <span>Payment Method:</span>
                  <span className="font-bold text-primary">{selectedReceipt.payment_method}</span>
                </div>
              </div>
            </div>

            <div className="text-center text-[11px] text-muted-foreground">
              Thank you for visiting Heavic Ventures! Hair extensions, styling, cosmetics & care.
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedReceipt(null)}
                className="h-10 flex-1 rounded-full font-bold"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  window.print();
                }}
                className="h-10 flex-1 rounded-full bg-brand font-bold text-primary-foreground shadow-brand"
              >
                <Printer className="mr-1.5 h-4 w-4" /> Print Receipt
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
