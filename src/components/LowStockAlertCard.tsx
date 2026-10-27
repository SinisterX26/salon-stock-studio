// @ts-nocheck
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  AlertOctagon,
  Package,
  Plus,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { productsOptions } from "@/lib/salon.queries";
import { cedi } from "@/lib/salon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";

type FilterMode = "all" | "out-of-stock" | "critical";

interface ProductItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  low_stock_threshold: number;
}

export function LowStockAlertCard() {
  const qc = useQueryClient();
  const { isAdmin } = useUserRole();

  // Fetch inventory data
  const { data: products = [], isLoading, isFetching } = useQuery(productsOptions);

  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [restockingId, setRestockingId] = useState<string | null>(null);
  const [batchRestocking, setBatchRestocking] = useState<boolean>(false);
  const [customRestockProduct, setCustomRestockProduct] = useState<ProductItem | null>(null);
  const [customAddAmount, setCustomAddAmount] = useState<number>(10);

  // Filter products that have fallen below or equal to their defined minimum threshold
  const lowStockProducts = useMemo(() => {
    return (products as ProductItem[])
      .filter((p) => p.quantity <= p.low_stock_threshold)
      .sort((a, b) => {
        // Out of stock first
        if (a.quantity === 0 && b.quantity !== 0) return -1;
        if (b.quantity === 0 && a.quantity !== 0) return 1;
        // Then by depletion percentage (lowest ratio first)
        const ratioA = a.low_stock_threshold > 0 ? a.quantity / a.low_stock_threshold : 0;
        const ratioB = b.low_stock_threshold > 0 ? b.quantity / b.low_stock_threshold : 0;
        return ratioA - ratioB;
      });
  }, [products]);

  // Sub-counts
  const outOfStockCount = useMemo(
    () => lowStockProducts.filter((p) => p.quantity === 0).length,
    [lowStockProducts],
  );

  const criticalCount = useMemo(
    () =>
      lowStockProducts.filter(
        (p) => p.quantity > 0 && p.quantity <= Math.ceil(p.low_stock_threshold / 2),
      ).length,
    [lowStockProducts],
  );

  // Estimated restock capital needed to restore items to healthy levels (2x threshold)
  const estimatedRestockValue = useMemo(() => {
    return lowStockProducts.reduce((acc, p) => {
      const unitsNeeded = Math.max(0, p.low_stock_threshold * 2 - p.quantity);
      return acc + unitsNeeded * Number(p.price);
    }, 0);
  }, [lowStockProducts]);

  // Filtered view by active tab
  const displayedItems = useMemo(() => {
    if (filterMode === "out-of-stock") {
      return lowStockProducts.filter((p) => p.quantity === 0);
    }
    if (filterMode === "critical") {
      return lowStockProducts.filter((p) => p.quantity <= Math.ceil(p.low_stock_threshold / 2));
    }
    return lowStockProducts;
  }, [lowStockProducts, filterMode]);

  // Single product restock action
  const handleRestock = async (product: ProductItem, amountToAdd: number) => {
    if (!isAdmin) {
      toast.error("Administrator privileges required to restock inventory.");
      return;
    }

    setRestockingId(product.id);
    try {
      const newQuantity = product.quantity + amountToAdd;
      const { error } = await supabase
        .from("products")
        .update({
          quantity: newQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product.id);

      if (error) {
        toast.error(`Restock failed: ${error.message}`);
      } else {
        toast.success(`Restocked +${amountToAdd} units for "${product.name}"`);
        await qc.invalidateQueries({ queryKey: ["products"] });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error restocking item");
    } finally {
      setRestockingId(null);
    }
  };

  // Batch restock all low stock products (+5 units each)
  const handleBatchRestockAll = async () => {
    if (!isAdmin) {
      toast.error("Administrator privileges required.");
      return;
    }

    if (lowStockProducts.length === 0) return;

    if (
      !confirm(`Batch restock +5 units to all ${lowStockProducts.length} low stock product(s)?`)
    ) {
      return;
    }

    setBatchRestocking(true);
    try {
      for (const p of lowStockProducts) {
        await supabase
          .from("products")
          .update({
            quantity: p.quantity + 5,
            updated_at: new Date().toISOString(),
          })
          .eq("id", p.id);
      }
      toast.success(
        `Successfully replenished +5 units to ${lowStockProducts.length} low stock items!`,
      );
      await qc.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error during batch restock");
    } finally {
      setBatchRestocking(false);
    }
  };

  // Custom quantity restock modal submit
  const handleCustomRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRestockProduct) return;
    const amount = Math.max(1, Math.floor(Number(customAddAmount) || 1));
    await handleRestock(customRestockProduct, amount);
    setCustomRestockProduct(null);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-300/80 bg-gradient-to-br from-amber-50/70 via-card to-card p-6 shadow-sm dark:border-amber-900/50 dark:from-amber-950/20 sm:p-7">
      {/* Decorative accent background blur */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl dark:bg-amber-500/5" />

      {/* Card Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-xs transition-colors ${
              lowStockProducts.length > 0
                ? "bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-300"
                : "bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-300"
            }`}
          >
            {outOfStockCount > 0 ? (
              <AlertOctagon className="h-6 w-6 animate-pulse text-destructive" />
            ) : lowStockProducts.length > 0 ? (
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            ) : (
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading text-2xl uppercase tracking-tight text-secondary sm:text-3xl">
                Low Stock Inventory Highlights
              </h3>
              {lowStockProducts.length > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-extrabold text-amber-800 dark:text-amber-200">
                  <TrendingDown className="h-3 w-3" />
                  {lowStockProducts.length} Items Below Threshold
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800 dark:text-emerald-200">
                  <CheckCircle2 className="h-3 w-3" />
                  All Thresholds Healthy
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Live automated filter of salon items that have fallen below their defined safety
              threshold.
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && lowStockProducts.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={batchRestocking}
              onClick={handleBatchRestockAll}
              className="h-9 rounded-full border-amber-300 bg-amber-100/70 text-xs font-bold text-amber-900 hover:bg-amber-200 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
              title="Restock +5 units to all low items"
            >
              <RefreshCw
                className={`mr-1.5 h-3.5 w-3.5 ${batchRestocking ? "animate-spin" : ""}`}
              />
              Restock All (+5 each)
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            asChild
            className="h-9 rounded-full px-3 text-xs font-bold text-primary hover:bg-primary/10"
          >
            <Link to="/stock" search={{ cat: "All", search: "" }}>
              Full Stock Catalog <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Sub-Metrics Row */}
      {lowStockProducts.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border/60 bg-card/80 p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Low Items
            </span>
            <div className="mt-1 font-heading text-2xl font-bold text-secondary">
              {lowStockProducts.length}
            </div>
          </div>

          <div
            className={`rounded-xl border p-3 ${
              outOfStockCount > 0
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : "border-border/60 bg-card/80"
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Out of Stock (0)
            </span>
            <div className="mt-1 font-heading text-2xl font-bold">{outOfStockCount}</div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/80 p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Severely Depleted
            </span>
            <div className="mt-1 font-heading text-2xl font-bold text-amber-600 dark:text-amber-400">
              {criticalCount}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/80 p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Est. Reorder Capital
            </span>
            <div className="mt-1 font-heading text-2xl font-bold text-secondary">
              {cedi(estimatedRestockValue)}
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs if multiple items */}
      {lowStockProducts.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <div className="flex gap-1.5">
            <button
              onClick={() => setFilterMode("all")}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                filterMode === "all"
                  ? "bg-secondary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All Below Min ({lowStockProducts.length})
            </button>

            {outOfStockCount > 0 && (
              <button
                onClick={() => setFilterMode("out-of-stock")}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                  filterMode === "out-of-stock"
                    ? "bg-destructive text-destructive-foreground shadow-xs"
                    : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                }`}
              >
                Out of Stock ({outOfStockCount})
              </button>
            )}

            <button
              onClick={() => setFilterMode("critical")}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                filterMode === "critical"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Critical Depletion ({criticalCount + outOfStockCount})
            </button>
          </div>

          <span className="text-xs text-muted-foreground">
            {isFetching ? "Refreshing inventory..." : `Showing ${displayedItems.length} item(s)`}
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="mt-4">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin opacity-50" />
            Scanning salon inventory thresholds...
          </div>
        ) : lowStockProducts.length === 0 ? (
          /* Celebratory Clean Empty State */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50/40 py-10 px-6 text-center dark:border-emerald-900/30 dark:bg-emerald-950/10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="mt-3 font-heading text-xl uppercase tracking-tight text-secondary">
              Inventory Health Perfect
            </h4>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              No salon products have fallen below their defined minimum safety thresholds. All hair
              bundles, shampoos, conditioners, oils, and styling accessories are sufficiently
              stocked.
            </p>
            <Button
              size="sm"
              variant="outline"
              asChild
              className="mt-4 rounded-full border-emerald-300 text-xs font-bold text-emerald-700 hover:bg-emerald-100/50 dark:border-emerald-800 dark:text-emerald-300"
            >
              <Link to="/stock">
                <Package className="mr-1.5 h-3.5 w-3.5" /> View All Inventory
              </Link>
            </Button>
          </div>
        ) : (
          /* Highlighted Low Stock Product Cards */
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {displayedItems.map((product) => {
              const isOut = product.quantity === 0;
              const percent =
                product.low_stock_threshold > 0
                  ? Math.min(
                      100,
                      Math.round((product.quantity / product.low_stock_threshold) * 100),
                    )
                  : 0;

              const isBusy = restockingId === product.id;

              return (
                <div
                  key={product.id}
                  className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4.5 transition-all hover:shadow-md ${
                    isOut
                      ? "border-destructive/40 bg-card shadow-xs ring-1 ring-destructive/20"
                      : "border-amber-200 bg-card shadow-xs dark:border-amber-900/40"
                  }`}
                >
                  {/* Top: Product Name, Category & Urgency Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                          {product.category}
                        </span>
                        <h4 className="truncate font-bold text-foreground text-sm">
                          {product.name}
                        </h4>
                      </div>

                      {isOut ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-extrabold text-destructive">
                          <AlertOctagon className="h-3 w-3" />
                          Out of Stock
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-extrabold text-amber-700 dark:text-amber-300">
                          <AlertTriangle className="h-3 w-3" />
                          Low Stock
                        </span>
                      )}
                    </div>

                    {/* Stock level visual bar and counts */}
                    <div className="mt-3.5 rounded-xl bg-muted/40 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Available Quantity:</span>
                        <span className="font-heading text-lg font-bold">
                          <span
                            className={
                              isOut
                                ? "text-destructive font-extrabold"
                                : "text-amber-600 dark:text-amber-400 font-extrabold"
                            }
                          >
                            {product.quantity}
                          </span>
                          <span className="text-xs text-muted-foreground font-normal">
                            {" "}
                            / {product.low_stock_threshold} min threshold
                          </span>
                        </span>
                      </div>

                      {/* Stock Health Progress Bar */}
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOut
                              ? "bg-destructive"
                              : percent <= 50
                                ? "bg-amber-500"
                                : "bg-amber-400"
                          }`}
                          style={{ width: `${Math.max(4, percent)}%` }}
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Unit Price: {cedi(product.price)}</span>
                        <span>{percent}% of min safe level</span>
                      </div>
                    </div>
                  </div>

                  {/* Restock & Navigation Action Footer */}
                  <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
                    <Link
                      to="/stock"
                      search={{ search: product.name, cat: "All" }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-primary"
                      title="Inspect in Stock Catalog"
                    >
                      <Layers className="h-3 w-3" />
                      <span>Inspect</span>
                    </Link>

                    {/* Restock Triggers */}
                    <div className="flex items-center gap-1.5">
                      {isAdmin ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => handleRestock(product, 5)}
                            className="h-8 rounded-lg border-primary/30 px-2.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground"
                            title="Quick restock +5 units"
                          >
                            <Plus className="mr-0.5 h-3 w-3" />5
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => handleRestock(product, 10)}
                            className="h-8 rounded-lg border-primary/30 px-2.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground"
                            title="Quick restock +10 units"
                          >
                            <Plus className="mr-0.5 h-3 w-3" />
                            10
                          </Button>

                          <Button
                            size="sm"
                            variant="default"
                            disabled={isBusy}
                            onClick={() => {
                              setCustomRestockProduct(product);
                              setCustomAddAmount(
                                product.low_stock_threshold * 2 - product.quantity,
                              );
                            }}
                            className="h-8 rounded-lg bg-brand px-2.5 text-xs font-bold text-primary-foreground shadow-xs"
                            title="Custom replenishment quantity"
                          >
                            Restock
                          </Button>
                        </>
                      ) : (
                        <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                          Restock alert active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom Restock Modal */}
      {customRestockProduct && (
        <Dialog
          open={!!customRestockProduct}
          onOpenChange={(o) => !o && setCustomRestockProduct(null)}
        >
          <DialogContent className="max-w-sm rounded-2xl p-6">
            <DialogHeader>
              <div className="flex items-center gap-2 text-primary">
                <Package className="h-5 w-5" />
                <DialogTitle className="font-heading text-xl uppercase tracking-tight text-secondary">
                  Restock Item
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Replenish inventory for <strong>{customRestockProduct.name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCustomRestockSubmit} className="mt-3 space-y-4">
              <div className="rounded-xl bg-muted/40 p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current in Stock:</span>
                  <span className="font-bold text-foreground">
                    {customRestockProduct.quantity} units
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Minimum Defined Threshold:</span>
                  <span className="font-bold text-foreground">
                    {customRestockProduct.low_stock_threshold} units
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unit Cost:</span>
                  <span className="font-bold text-secondary">
                    {cedi(customRestockProduct.price)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Quantity to Add
                </label>
                <Input
                  type="number"
                  min={1}
                  value={customAddAmount}
                  onChange={(e) => setCustomAddAmount(Math.max(1, Number(e.target.value) || 1))}
                  className="h-11 rounded-xl"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  New stock total will be:{" "}
                  <strong>{customRestockProduct.quantity + customAddAmount} units</strong>
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCustomRestockProduct(null)}
                  className="h-10 flex-1 rounded-full font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-10 flex-1 rounded-full bg-brand font-bold text-primary-foreground shadow-brand"
                >
                  Confirm Restock
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
