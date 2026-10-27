import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShoppingCart, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { productsOptions, teamOptions } from "@/lib/salon.queries";
import { cedi, saleTotal, PAYMENT_METHODS } from "@/lib/salon";
import { useUserRole } from "@/hooks/use-user-role";

interface RecordSaleDialogProps {
  open: boolean;
  onClose: () => void;
  preselectedProductId?: string;
  onSaleCompleted?: () => void;
}

export function RecordSaleDialog({
  open,
  onClose,
  preselectedProductId,
  onSaleCompleted,
}: RecordSaleDialogProps) {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery(productsOptions);
  const { data: team = [] } = useQuery(teamOptions);
  const { isAdmin, userName } = useUserRole();

  const [productId, setProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [customer, setCustomer] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [staffName, setStaffName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  // Sync selected product when opened or changed
  useEffect(() => {
    if (open) {
      const selectedId = preselectedProductId || (products.length > 0 ? products[0]?.id : "");
      if (selectedId) {
        setProductId(selectedId);
        const p = products.find((item) => item.id === selectedId);
        if (p) {
          setUnitPrice(p.price);
        }
      }
      setQuantity(1);
      setCustomer("");
      setPaymentMethod("Cash");
      setNotes("");
      setStaffName(userName || (team[0]?.name ?? "Staff Member"));
    }
  }, [open, preselectedProductId, products, team, userName]);

  const selectedProduct = products.find((p) => p.id === productId);
  const availableStock = selectedProduct ? selectedProduct.quantity : 0;

  const handleProductChange = (id: string) => {
    setProductId(id);
    const p = products.find((item) => item.id === id);
    if (p) {
      setUnitPrice(p.price);
      if (quantity > p.quantity && p.quantity > 0) {
        setQuantity(p.quantity);
      }
    }
  };

  const calculatedTotal = selectedProduct ? saleTotal(Math.max(1, quantity), unitPrice) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error("Please select a valid product");
      return;
    }

    if (quantity < 1 || !Number.isInteger(quantity)) {
      toast.error("Quantity must be a positive integer");
      return;
    }

    if (quantity > availableStock) {
      toast.error(`Only ${availableStock} in stock! Reduce sale quantity.`);
      return;
    }

    if (unitPrice < 0) {
      toast.error("Unit price cannot be negative");
      return;
    }

    setBusy(true);

    try {
      const salePayload = {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity,
        unit_price: unitPrice,
        customer: customer.trim() || "Walk-in Client",
        payment_method: paymentMethod,
        staff_name: staffName.trim() || userName || "Staff",
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("sales").insert(salePayload);

      if (error) {
        toast.error(`Failed to record sale: ${error.message}`);
        setBusy(false);
        return;
      }

      toast.success(
        `Recorded sale: ${quantity}x ${selectedProduct.name} (${cedi(calculatedTotal)})`,
      );

      // Invalidate both sales and products to update stock everywhere
      await qc.invalidateQueries({ queryKey: ["sales"] });
      await qc.invalidateQueries({ queryKey: ["products"] });

      if (onSaleCompleted) {
        onSaleCompleted();
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error recording sale");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <ShoppingCart className="h-5 w-5" />
            <DialogTitle className="font-heading text-2xl uppercase tracking-tight text-secondary">
              Record Salon Sale
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Register client purchase. Stock is automatically deducted from inventory.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          {/* Product Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Product / Item
            </Label>
            <Select value={productId} onValueChange={handleProductChange}>
              <SelectTrigger className="h-11 rounded-xl bg-card">
                <SelectValue placeholder="Select salon item..." />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id} disabled={p.quantity <= 0}>
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {cedi(p.price)} ·{" "}
                        {p.quantity <= 0 ? "OUT OF STOCK" : `${p.quantity} in stock`}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity & Unit Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Quantity
                </Label>
                {selectedProduct && (
                  <span
                    className={`text-xs font-bold ${
                      availableStock <= 3 ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    Max: {availableStock}
                  </span>
                )}
              </div>
              <Input
                type="number"
                min={1}
                max={Math.max(1, availableStock)}
                value={quantity}
                onChange={(e) => setQuantity(Math.floor(Number(e.target.value) || 1))}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Unit Price (GH₵)
                </Label>
                {!isAdmin && <span className="text-[10px] text-muted-foreground">Locked</span>}
              </div>
              <Input
                type="number"
                step="0.01"
                min={0}
                disabled={!isAdmin}
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
                className="h-11 rounded-xl bg-card"
              />
            </div>
          </div>

          {/* Payment Method & Staff Attribution */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Payment Method
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-11 rounded-xl bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Recorded By / Stylist
              </Label>
              <Select value={staffName} onValueChange={setStaffName}>
                <SelectTrigger className="h-11 rounded-xl bg-card">
                  <SelectValue placeholder="Staff member" />
                </SelectTrigger>
                <SelectContent>
                  {team.map((m) => (
                    <SelectItem key={m.id} value={m.name}>
                      {m.name} ({m.position})
                    </SelectItem>
                  ))}
                  <SelectItem value={userName}>{userName}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Customer Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Customer Name / Phone (Optional)
            </Label>
            <Input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="e.g. Ama Serwaa (024 123 4567)"
              className="h-11 rounded-xl"
            />
          </div>

          {/* Live Order Total Banner */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Total Transaction Amount
                </p>
                <p className="text-xs text-primary font-bold">
                  {quantity} item(s) @ {cedi(unitPrice)}
                </p>
              </div>
              <div className="font-heading text-3xl font-extrabold text-secondary">
                {cedi(calculatedTotal)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
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
              disabled={busy || availableStock <= 0}
              className="h-11 flex-1 rounded-full bg-brand font-bold text-primary-foreground shadow-brand hover:opacity-95"
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              {busy ? "Recording..." : `Confirm Sale (${cedi(calculatedTotal)})`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
