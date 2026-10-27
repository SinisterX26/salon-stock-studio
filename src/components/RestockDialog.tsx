// @ts-nocheck
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PackagePlus,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
  Truck,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { productsOptions } from "@/lib/salon.queries";
import { cedi } from "@/lib/salon";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserRole } from "@/hooks/use-user-role";

interface RestockDialogProps {
  open: boolean;
  onClose: () => void;
  defaultProductId?: string | null;
}

export function RestockDialog({ open, onClose, defaultProductId }: RestockDialogProps) {
  const qc = useQueryClient();
  const { isAdmin } = useUserRole();
  const { data: products = [] } = useQuery(productsOptions);

  const [selectedId, setSelectedId] = useState<string>("");
  const [amountToAdd, setAmountToAdd] = useState<number>(10);
  const [supplierNote, setSupplierNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync selectedId when opened or defaultProductId changes
  useEffect(() => {
    if (open) {
      if (defaultProductId && products.some((p) => p.id === defaultProductId)) {
        setSelectedId(defaultProductId);
      } else if (products.length > 0 && !selectedId) {
        setSelectedId(products[0].id);
      }
    }
  }, [open, defaultProductId, products, selectedId]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedId),
    [products, selectedId],
  );

  const currentQty = selectedProduct?.quantity ?? 0;
  const newQty = Math.max(0, currentQty + (Number(amountToAdd) || 0));
  const addedValue = selectedProduct
    ? (Number(amountToAdd) || 0) * Number(selectedProduct.price)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      toast.error("Only Administrators can record stock replenishment.");
      return;
    }

    if (!selectedProduct) {
      toast.error("Please choose a product to restock.");
      return;
    }

    const qty = Math.max(1, Math.floor(Number(amountToAdd) || 0));
    if (qty <= 0) {
      toast.error("Please specify a valid quantity greater than zero.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({
          quantity: currentQty + qty,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedProduct.id);

      if (error) {
        toast.error(`Restock failed: ${error.message}`);
      } else {
        toast.success(
          `Stock updated: Added +${qty} units to "${selectedProduct.name}". New Total: ${
            currentQty + qty
          } units.`,
          {
            description: supplierNote
              ? `Supplier note: ${supplierNote}`
              : "Inventory catalog updated successfully.",
          },
        );
        await qc.invalidateQueries({ queryKey: ["products"] });
        setSupplierNote("");
        onClose();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error updating stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickAmounts = [5, 10, 20, 50, 100];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg rounded-3xl p-6 sm:p-7">
        <DialogHeader>
          <div className="flex items-center gap-2.5 text-primary">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              <PackagePlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-heading text-2xl uppercase tracking-tight text-secondary">
                Restock Inventory / Stock In
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Add stock replenishment units to your Heavic Ventures salon catalog.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Product Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Select Salon Product
            </Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="h-12 rounded-xl bg-card">
                <SelectValue placeholder="Choose product from catalog..." />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({p.category} · {p.quantity} in stock)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current Stock vs New Stock Preview Card */}
          {selectedProduct && (
            <div className="rounded-2xl border border-primary/20 bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Category:</span>
                <span className="font-bold text-foreground">{selectedProduct.category}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Retail Unit Price:</span>
                <span className="font-bold text-secondary">{cedi(selectedProduct.price)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Low Stock Threshold:</span>
                <span className="font-bold text-foreground">
                  ≤ {selectedProduct.low_stock_threshold} units
                </span>
              </div>

              {/* Visual Quantity Calculation */}
              <div className="flex items-center justify-between rounded-xl bg-card p-3 border">
                <div>
                  <span className="text-[11px] font-bold uppercase text-muted-foreground">
                    Current Stock
                  </span>
                  <div className="font-heading text-xl text-foreground">{currentQty}</div>
                </div>

                <div className="flex items-center text-primary font-bold">
                  <span className="text-sm">+</span>
                  <ArrowRight className="h-4 w-4 mx-1.5" />
                </div>

                <div>
                  <span className="text-[11px] font-bold uppercase text-primary">Units Adding</span>
                  <div className="font-heading text-xl text-primary">+{amountToAdd || 0}</div>
                </div>

                <div className="flex items-center text-muted-foreground font-bold">
                  <span className="text-sm">=</span>
                  <ArrowRight className="h-4 w-4 mx-1.5" />
                </div>

                <div>
                  <span className="text-[11px] font-bold uppercase text-emerald-600">
                    New Total
                  </span>
                  <div className="font-heading text-xl text-emerald-600 font-extrabold">
                    {newQty}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick-Add Buttons */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Quantity to Add
            </Label>
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((amt) => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => setAmountToAdd(amt)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                    amountToAdd === amt
                      ? "bg-brand text-primary-foreground shadow-xs"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  +{amt} units
                </button>
              ))}
            </div>

            <div className="mt-2">
              <Input
                type="number"
                min={1}
                value={amountToAdd}
                onChange={(e) => setAmountToAdd(Math.max(1, Number(e.target.value) || 1))}
                placeholder="Custom quantity..."
                className="h-11 rounded-xl"
                required
              />
            </div>
          </div>

          {/* Supplier or Delivery Note */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Supplier / Batch Delivery Note (Optional)
            </Label>
            <div className="relative">
              <Truck className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={supplierNote}
                onChange={(e) => setSupplierNote(e.target.value)}
                placeholder="e.g. Makola Market batch shipment, Accra Hair Imports..."
                className="h-11 rounded-xl pl-10"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-11 flex-1 rounded-full font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedProduct}
              className="h-11 flex-1 rounded-full bg-brand font-bold text-primary-foreground shadow-brand hover:opacity-95"
            >
              {isSubmitting ? "Restocking..." : `Confirm Restock (+${amountToAdd || 0})`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
