// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  Package,
  AlertTriangle,
  Users,
  ShoppingCart,
  Plus,
  ArrowUpRight,
  Receipt,
  TrendingUp,
  ShieldCheck,
  UserCheck,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronRight,
  Sparkles,
  PackagePlus,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { productsOptions, salesOptions, teamOptions } from "@/lib/salon.queries";
import { cedi, formatDate } from "@/lib/salon";
import { Button } from "@/components/ui/button";
import { RecordSaleDialog } from "@/components/RecordSaleDialog";
import { RestockDialog } from "@/components/RestockDialog";
import { LowStockAlertCard } from "@/components/LowStockAlertCard";
import { useUserRole } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Heavic Ventures Salon Studio" },
      {
        name: "description",
        content: "Overview of salon sales, stock levels, staff activity and revenue metrics.",
      },
      { property: "og:title", content: "Dashboard — Heavic Ventures Salon Studio" },
      {
        property: "og:description",
        content: "Overview of salon sales, stock levels, staff activity and revenue metrics.",
      },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(productsOptions),
      context.queryClient.ensureQueryData(salesOptions),
      context.queryClient.ensureQueryData(teamOptions),
    ]);
  },
  component: DashboardPage,
});

type Period = "all" | "today" | "week" | "month";

function DashboardPage() {
  const qc = useQueryClient();
  const { data: products } = useSuspenseQuery(productsOptions);
  const { data: sales } = useSuspenseQuery(salesOptions);
  const { data: team } = useSuspenseQuery(teamOptions);
  const { isAdmin, role, userName } = useUserRole();

  const [period, setPeriod] = useState<Period>("all");
  const [saleDialogOpen, setSaleDialogOpen] = useState<boolean>(false);
  const [restockDialogOpen, setRestockDialogOpen] = useState<boolean>(false);
  const [restockBusyId, setRestockBusyId] = useState<string | null>(null);

  // Filter sales by time period
  const filteredSales = useMemo(() => {
    if (period === "all") return sales;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(startOfToday);
    const daysSinceMonday = (startOfWeek.getDay() + 6) % 7;
    startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return sales.filter((s) => {
      const saleTime = new Date(s.created_at).getTime();
      if (!Number.isFinite(saleTime) || saleTime > now.getTime()) return false;
      if (period === "today") return saleTime >= startOfToday;
      if (period === "week") return saleTime >= startOfWeek.getTime();
      if (period === "month") return saleTime >= startOfMonth;
      return true;
    });
  }, [sales, period]);

  // Key performance calculations
  const totalRevenue = useMemo(
    () => filteredSales.reduce((acc, s) => acc + s.quantity * Number(s.unit_price), 0),
    [filteredSales],
  );

  const totalInventoryValue = useMemo(
    () => products.reduce((acc, p) => acc + p.quantity * Number(p.price), 0),
    [products],
  );

  const totalItemsInStock = useMemo(
    () => products.reduce((acc, p) => acc + p.quantity, 0),
    [products],
  );

  const lowStockProducts = useMemo(
    () => products.filter((p) => p.quantity <= p.low_stock_threshold),
    [products],
  );

  // Payment method distribution
  const paymentBreakdown = useMemo(() => {
    const counts = { Cash: 0, "Mobile Money": 0, Card: 0 };
    filteredSales.forEach((s) => {
      const amount = s.quantity * Number(s.unit_price);
      if (s.payment_method === "Mobile Money") counts["Mobile Money"] += amount;
      else if (s.payment_method === "Card") counts.Card += amount;
      else counts.Cash += amount;
    });
    return counts;
  }, [filteredSales]);

  // Category stock & sales distribution
  const categoryStats = useMemo(() => {
    const cats: Record<string, { count: number; value: number }> = {};
    products.forEach((p) => {
      const cat = p.category || "General";
      if (!cats[cat]) cats[cat] = { count: 0, value: 0 };
      cats[cat].count += p.quantity;
      cats[cat].value += p.quantity * Number(p.price);
    });
    return Object.entries(cats).sort((a, b) => b[1].value - a[1].value);
  }, [products]);

  // Top selling products by volume
  const topSellers = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; revenue: number }> = {};
    filteredSales.forEach((s) => {
      const key = s.product_name;
      if (!map[key]) map[key] = { name: key, quantity: 0, revenue: 0 };
      map[key].quantity += s.quantity;
      map[key].revenue += s.quantity * Number(s.unit_price);
    });
    return Object.values(map)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 4);
  }, [sales]);

  // Quick Restock action (Admin or authorized)
  const handleQuickRestock = async (productId: string, currentQty: number) => {
    if (!isAdmin) {
      toast.error("Administrator privileges required to adjust master stock.");
      return;
    }
    setRestockBusyId(productId);
    const { error } = await supabase
      .from("products")
      .update({ quantity: currentQty + 5, updated_at: new Date().toISOString() })
      .eq("id", productId);
    setRestockBusyId(null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Restocked +5 units");
      qc.invalidateQueries({ queryKey: ["products"] });
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome & Actions Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card to-muted/40 p-6 sm:p-8 border shadow-xs">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/40 px-3 py-1 text-xs font-extrabold text-secondary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Salon Live Operations</span>
            </div>
            <h2 className="font-heading text-3xl font-extrabold uppercase text-secondary sm:text-4xl">
              Hello, {userName}
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              Monitor inventory stock, sales revenue, and stylist commissions in Ghanaian Cedis
              (GH₵).
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setSaleDialogOpen(true)}
              className="h-12 rounded-full bg-brand px-6 font-bold text-primary-foreground shadow-brand hover:opacity-95"
            >
              <ShoppingCart className="mr-2 h-4 w-4" /> Record Sale
            </Button>

            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => setRestockDialogOpen(true)}
                className="h-12 rounded-full border-primary/30 bg-card px-5 font-bold text-primary hover:bg-primary/10"
                title="Replenish stock for any salon item"
              >
                <PackagePlus className="mr-2 h-4 w-4" /> Restock Stock
              </Button>
            )}

            {isAdmin && (
              <Button
                variant="outline"
                asChild
                className="h-12 rounded-full border-border bg-card px-5 font-bold hover:bg-muted"
              >
                <Link to="/stock">
                  <Plus className="mr-2 h-4 w-4" /> Add Product
                </Link>
              </Button>
            )}

            <Button
              variant="outline"
              asChild
              className="h-12 rounded-full border-border bg-card px-5 font-bold hover:bg-muted"
            >
              <Link to="/team">
                <Users className="mr-2 h-4 w-4" /> View Team
              </Link>
            </Button>
          </div>
        </div>

        {/* Time Period Filter Tabs */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-5">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Revenue Timeline:
          </div>
          <div className="flex rounded-full bg-muted/80 p-1">
            {(
              [
                { id: "all", label: "All Time" },
                { id: "today", label: "Today" },
                { id: "week", label: "This Week" },
                { id: "month", label: "This Month" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  period === tab.id
                    ? "bg-card text-secondary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Sales */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs transition-hover hover:border-primary/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Sales Revenue ({period.toUpperCase()})
            </span>
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 font-heading text-3xl font-extrabold text-secondary">
            {cedi(totalRevenue)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Receipt className="h-3.5 w-3.5 text-primary" />
            <span>{filteredSales.length} recorded sale(s)</span>
          </div>
        </div>

        {/* Stock Valuation */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs transition-hover hover:border-primary/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Stock Valuation
            </span>
            <div className="rounded-full bg-muted p-2 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 font-heading text-3xl font-extrabold text-secondary">
            {cedi(totalInventoryValue)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Package className="h-3.5 w-3.5" />
            <span>
              {totalItemsInStock} total units ({products.length} products)
            </span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div
          className={`rounded-2xl border p-5 shadow-xs transition-hover ${
            lowStockProducts.length > 0
              ? "border-amber-300 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20"
              : "bg-card"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Low Stock Warnings
            </span>
            <div
              className={`rounded-full p-2 ${
                lowStockProducts.length > 0
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div
            className={`mt-3 font-heading text-3xl font-extrabold ${
              lowStockProducts.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-secondary"
            }`}
          >
            {lowStockProducts.length} Item(s)
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Uses each product’s alert threshold</span>
            {lowStockProducts.length > 0 && (
              <Link to="/stock" className="font-bold text-primary hover:underline">
                View Stock →
              </Link>
            )}
          </div>
        </div>

        {/* Team Members */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs transition-hover hover:border-primary/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Active Salon Staff
            </span>
            <div className="rounded-full bg-secondary/10 p-2 text-secondary">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 font-heading text-3xl font-extrabold text-secondary">
            {team.length} Stylists
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Branch: Heavic Salon</span>
            <Link to="/team" className="font-bold text-primary hover:underline">
              Manage →
            </Link>
          </div>
        </div>
      </div>

      {/* Dedicated Low Stock Inventory Alert Card */}
      <LowStockAlertCard />

      {/* Grid: Recent Sales & Stock Breakdown */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Recent Sales Activity (2 Cols) */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading text-2xl uppercase tracking-tight text-secondary">
                Recent Sales Activity
              </h3>
              <p className="text-xs text-muted-foreground">
                Latest transactions across all payment channels
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs font-bold text-primary">
              <Link to="/sales">
                View All ({sales.length}) <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
            {filteredSales.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Receipt className="mx-auto mb-2 h-8 w-8 opacity-40" />
                <p className="font-bold">No sales recorded for this period.</p>
                <Button
                  onClick={() => setSaleDialogOpen(true)}
                  className="mt-4 rounded-full bg-brand font-bold text-primary-foreground"
                >
                  Record First Sale
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {filteredSales.slice(0, 6).map((sale) => {
                  const saleAmount = sale.quantity * Number(sale.unit_price);
                  return (
                    <div
                      key={sale.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/30 sm:flex-nowrap"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-full p-2.5 ${
                            sale.payment_method === "Mobile Money"
                              ? "bg-amber-500/10 text-amber-600"
                              : sale.payment_method === "Card"
                                ? "bg-blue-500/10 text-blue-600"
                                : "bg-emerald-500/10 text-emerald-600"
                          }`}
                        >
                          {sale.payment_method === "Mobile Money" ? (
                            <Smartphone className="h-4 w-4" />
                          ) : sale.payment_method === "Card" ? (
                            <CreditCard className="h-4 w-4" />
                          ) : (
                            <Banknote className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-foreground">{sale.product_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {sale.quantity}x @ {cedi(Number(sale.unit_price))} ·{" "}
                            {sale.customer || "Walk-in Client"}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-heading text-lg font-bold text-secondary">
                          {cedi(saleAmount)}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatDate(sale.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Method Distribution Breakdown */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Smartphone className="h-4 w-4 text-amber-600" />
                <span>Mobile Money</span>
              </div>
              <div className="mt-2 font-heading text-2xl font-bold text-secondary">
                {cedi(paymentBreakdown["Mobile Money"])}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Banknote className="h-4 w-4 text-emerald-600" />
                <span>Cash Sales</span>
              </div>
              <div className="mt-2 font-heading text-2xl font-bold text-secondary">
                {cedi(paymentBreakdown.Cash)}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <span>Card Terminal</span>
              </div>
              <div className="mt-2 font-heading text-2xl font-bold text-secondary">
                {cedi(paymentBreakdown.Card)}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Top Selling Products & Category Valuation */}
        <div className="space-y-6">
          {/* Top Selling Products */}
          <div className="rounded-2xl border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl uppercase tracking-tight text-secondary">
                Top Selling Products
              </h3>
              <span className="rounded-full bg-accent/40 px-2 py-0.5 text-xs font-bold text-accent-foreground">
                High Demand
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {topSellers.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No product sales data recorded yet.
                </div>
              ) : (
                topSellers.map((item, idx) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-foreground">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.quantity} units sold · {cedi(item.revenue)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Stock by Category Distribution */}
          <div className="rounded-2xl border bg-card p-5 shadow-xs">
            <h3 className="font-heading text-xl uppercase tracking-tight text-secondary">
              Inventory by Category
            </h3>
            <div className="mt-4 space-y-3">
              {categoryStats.map(([cat, data]) => {
                const percent =
                  totalInventoryValue > 0
                    ? Math.round((data.value / totalInventoryValue) * 100)
                    : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{cat}</span>
                      <span className="text-muted-foreground">
                        {data.count} units · {cedi(data.value)} ({percent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-brand transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Administrator Role Governance & Security Card */}
          <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Privilege Level</span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-extrabold text-primary">
                <Lock className="h-3 w-3" /> Administrator Locked
              </span>
            </div>
            <p className="mt-2 font-heading text-xl uppercase text-secondary">
              Permanent Master Administrator
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Administrator authority is permanently active. Only the Administrator can assign roles
              to salon staff, restock master inventory, and manage team privileges. Administrator
              account cannot switch or demote to staff.
            </p>

            <div className="mt-3.5 space-y-2 rounded-xl bg-card/80 border p-3 text-xs">
              <div className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="font-semibold">
                  Exclusive authority to assign staff roles in Team section
                </span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Master stock replenishment & wholesale pricing control</span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Staff members cannot reassign privileges or promote accounts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sale Recording Modal */}
      <RecordSaleDialog open={saleDialogOpen} onClose={() => setSaleDialogOpen(false)} />

      {/* Stock Replenishment Modal */}
      <RestockDialog open={restockDialogOpen} onClose={() => setRestockDialogOpen(false)} />
    </div>
  );
}
