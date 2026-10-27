import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Minus,
  Plus,
  Pencil,
  Trash2,
  Search,
  Package,
  AlertTriangle,
  Wallet,
  Lock,
  ShoppingCart,
  ShieldCheck,
  UserCheck,
  Filter,
  PackagePlus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { productsOptions } from "@/lib/salon.queries";
import { cedi, CATEGORIES } from "@/lib/salon";
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
import { RecordSaleDialog } from "@/components/RecordSaleDialog";
import { RestockDialog } from "@/components/RestockDialog";

export const Route = createFileRoute("/_authenticated/stock")({
  validateSearch: (s: Record<string, unknown>) => ({
    search: typeof s.search === "string" ? s.search : "",
    cat: typeof s.cat === "string" ? s.cat : "All",
  }),
  head: () => ({
    meta: [
      { title: "Stock & Inventory — Heavic Ventures" },
      {
        name: "description",
        content: "Track hair extensions, shampoos, oils and accessories in stock.",
      },
      { property: "og:title", content: "Stock & Inventory — Heavic Ventures" },
      {
        property: "og:description",
        content: "Track hair extensions, shampoos, oils and accessories in stock.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsOptions),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-destructive font-bold">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-6 text-muted-foreground">Stock item not found.</div>,
  component: Dashboard,
});

type Product = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  low_stock_threshold: number;
};

function Dashboard() {
  const qc = useQueryClient();
  const { search, cat } = Route.useSearch();
  const navigate = Route.useNavigate();
  const setSearch = (search: string) => navigate({ search: (prev) => ({ ...prev, search }) });
  const setCat = (cat: string) => navigate({ search: (prev) => ({ ...prev, cat }) });
  const { isAdmin } = useUserRole();

  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [onlyLowStock, setOnlyLowStock] = useState<boolean>(false);
  const [sellProductId, setSellProductId] = useState<string | null>(null);
  const [restockOpen, setRestockOpen] = useState<boolean>(false);
  const [restockProductId, setRestockProductId] = useState<string | null>(null);

  const { data: products } = useSuspenseQuery(productsOptions);

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const matchesCategory = cat === "All" || p.category === cat;
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchesLow = !onlyLowStock || p.quantity <= p.low_stock_threshold;
        return matchesCategory && matchesSearch && matchesLow;
      }),
    [products, cat, search, onlyLowStock],
  );

  const totalItems = products.reduce((s, p) => s + p.quantity, 0);
  const lowCount = products.filter((p) => p.quantity <= p.low_stock_threshold).length;
  const value = products.reduce((s, p) => s + p.quantity * p.price, 0);

  const refresh = () => qc.invalidateQueries({ queryKey: ["products"] });

  async function adjust(p: Product, delta: number) {
    if (!isAdmin) {
      toast.error(
        "Administrator privileges required to adjust master inventory directly. Use Record Sale to sell items.",
      );
      return;
    }
    const q = Math.max(0, p.quantity + delta);
    const { error } = await supabase
      .from("products")
      .update({ quantity: q, updated_at: new Date().toISOString() })
      .eq("id", p.id);
    if (error) toast.error(error.message);
    refresh();
  }

  async function remove(p: Product) {
    if (!isAdmin) {
      toast.error("Only Administrators can delete products from the master catalog.");
      return;
    }
    if (!confirm(`Permanently delete "${p.name}" from Heavic Ventures inventory?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) toast.error(error.message);
    else toast.success("Product deleted from catalog");
    refresh();
  }

  return (
    <div className="space-y-6">
      <main>
        {/* KPI Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat icon={<Package />} label="Total Items in stock" value={totalItems.toString()} />
          <Stat
            icon={<AlertTriangle />}
            label="Low stock items"
            value={lowCount.toString()}
            highlight={lowCount > 0}
          />
          <Stat icon={<Wallet />} label="Inventory Value" value={cedi(value)} />
        </div>

        {/* Filter & Action Controls */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products by title or brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 rounded-full bg-card pl-11"
            />
          </div>

          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="h-12 rounded-full bg-card sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Low Stock Quick Filter Toggle */}
          <Button
            type="button"
            variant={onlyLowStock ? "default" : "outline"}
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`h-12 rounded-full font-bold transition-all ${
              onlyLowStock ? "bg-amber-600 text-white" : "border-border bg-card"
            }`}
          >
            <Filter className="mr-1.5 h-4 w-4" />
            {onlyLowStock ? "Showing Low Stock" : `Low Stock (${lowCount})`}
          </Button>

          {/* Restock / Stock In Button */}
          {isAdmin ? (
            <Button
              onClick={() => {
                setRestockProductId(null);
                setRestockOpen(true);
              }}
              variant="outline"
              className="h-12 rounded-full border-primary/30 bg-card px-5 font-bold text-primary hover:bg-primary/10"
              title="Add stock replenishment to any salon product"
            >
              <PackagePlus className="mr-1.5 h-4 w-4" /> Restock / Stock In
            </Button>
          ) : null}

          {/* Add Product Button (Admin only) */}
          {isAdmin ? (
            <Button
              onClick={() =>
                setEditing({
                  category: "Hair Extensions",
                  quantity: 0,
                  price: 0,
                  low_stock_threshold: 5,
                })
              }
              className="h-12 rounded-full bg-brand px-6 font-bold text-primary-foreground shadow-brand hover:opacity-95"
            >
              <Plus className="mr-1 h-4 w-4" /> Add Product
            </Button>
          ) : (
            <Button
              disabled
              variant="outline"
              className="h-12 rounded-full border-dashed opacity-60"
              title="Admin privileges required to add new products"
            >
              <Lock className="mr-1 h-3.5 w-3.5" /> Add Product (Admin Only)
            </Button>
          )}
        </div>

        {/* Product List Table / Card View */}
        <div className="mt-6 overflow-hidden rounded-2xl border bg-card shadow-xs">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              {products.length === 0
                ? "No products yet. Add your first item to start tracking."
                : "No products match your search or category filter."}
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((p) => {
                const low = p.quantity <= p.low_stock_threshold;
                const outOfStock = p.quantity <= 0;

                return (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/20 sm:flex-nowrap sm:p-5"
                  >
                    {/* Title & Metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-bold text-foreground text-base">
                          {p.name}
                        </span>
                        {outOfStock ? (
                          <span className="rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-bold text-destructive">
                            Out of Stock
                          </span>
                        ) : low ? (
                          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">
                            Low Stock (≤{p.low_stock_threshold})
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {p.category} ·{" "}
                        <span className="font-semibold text-foreground">{cedi(p.price)}</span>
                      </div>
                    </div>

                    {/* Stock Count & Controls */}
                    <div className="flex items-center gap-3">
                      {/* Sell Item Button (accessible to both staff and admin) */}
                      <Button
                        size="sm"
                        disabled={outOfStock}
                        onClick={() => setSellProductId(p.id)}
                        className="h-9 rounded-full bg-primary/10 font-bold text-primary hover:bg-primary hover:text-primary-foreground"
                        title="Sell this item to client"
                      >
                        <ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> Sell
                      </Button>

                      {/* Quantity Stepper (Admin or locked for Staff) */}
                      <div className="flex items-center gap-1 rounded-full border bg-muted/40 p-1">
                        {isAdmin ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-full"
                            onClick={() => adjust(p, -1)}
                            aria-label="Decrease"
                            disabled={outOfStock}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <div className="px-1 text-muted-foreground/50">
                            <Lock className="h-3 w-3" />
                          </div>
                        )}

                        <span
                          className={`w-10 text-center font-heading text-xl ${
                            outOfStock
                              ? "text-destructive"
                              : low
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-secondary"
                          }`}
                        >
                          {p.quantity}
                        </span>

                        {isAdmin && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-full"
                            onClick={() => adjust(p, 1)}
                            aria-label="Increase"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Admin Actions: Restock, Edit & Delete */}
                      {isAdmin ? (
                        <div className="flex gap-1 border-l pl-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setRestockProductId(p.id);
                              setRestockOpen(true);
                            }}
                            aria-label="Restock"
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            title="Restock units for this product"
                          >
                            <PackagePlus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditing(p)}
                            aria-label="Edit"
                            className="h-8 w-8 hover:bg-muted"
                            title="Edit product"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => remove(p)}
                            aria-label="Delete"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            title="Delete product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="border-l pl-2 text-xs text-muted-foreground/60 italic">
                          Staff view
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>

      {/* Edit / Add Product Dialog (Admin Only) */}
      <ProductDialog product={editing} onClose={() => setEditing(null)} onSaved={refresh} />

      {/* Restock Inventory Dialog (Admin Only) */}
      <RestockDialog
        open={restockOpen}
        onClose={() => {
          setRestockOpen(false);
          setRestockProductId(null);
        }}
        defaultProductId={restockProductId}
      />

      {/* Sell Dialog (Available to both Admin and Staff) */}
      {sellProductId && (
        <RecordSaleDialog
          open={!!sellProductId}
          preselectedProductId={sellProductId}
          onClose={() => setSellProductId(null)}
          onSaleCompleted={refresh}
        />
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-xs transition-hover">
      <div
        className={`mb-3 inline-flex rounded-full p-2.5 ${
          highlight ? "bg-accent text-accent-foreground font-bold" : "bg-muted text-primary"
        }`}
      >
        {icon}
      </div>
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-heading text-3xl font-extrabold text-secondary">{value}</div>
    </div>
  );
}

function ProductDialog({
  product,
  onClose,
  onSaved,
}: {
  product: Partial<Product> | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Product>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm(product ?? {}), [product]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const name = (form.name ?? "").trim();
    if (!name || name.length > 120) {
      toast.error("Enter a product name (max 120 characters)");
      return;
    }
    const payload = {
      name,
      category: form.category ?? "Accessories",
      quantity: Math.max(0, Math.floor(Number(form.quantity) || 0)),
      price: Math.max(0, Number(form.price) || 0),
      low_stock_threshold: Math.max(0, Math.floor(Number(form.low_stock_threshold) || 0)),
      updated_at: new Date().toISOString(),
    };
    setBusy(true);
    const { error } = form.id
      ? await supabase.from("products").update(payload).eq("id", form.id)
      : await supabase.from("products").insert(payload);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(form.id ? "Product updated" : "Product added to salon catalog");
    onSaved();
    onClose();
  }

  const set = (k: keyof Product) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl uppercase text-secondary">
            {form.id ? "Edit Product" : "Add New Product"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure hair extension bundle, shampoo, cosmetic, or styling accessory.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={save} className="mt-2 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Product Name
            </Label>
            <Input
              value={form.name ?? ""}
              onChange={set("name")}
              placeholder="e.g. Body wave bundle 22”"
              className="h-11 rounded-xl"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Category
            </Label>
            <Select
              value={form.category ?? "Accessories"}
              onValueChange={(v) => setForm({ ...form, category: v })}
            >
              <SelectTrigger className="h-11 rounded-xl bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Quantity
              </Label>
              <Input
                type="number"
                min={0}
                value={form.quantity ?? 0}
                onChange={set("quantity")}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Price (GH₵)
              </Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.price ?? 0}
                onChange={set("price")}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Low Alert At
              </Label>
              <Input
                type="number"
                min={0}
                value={form.low_stock_threshold ?? 5}
                onChange={set("low_stock_threshold")}
                className="h-11 rounded-xl"
              />
            </div>
          </div>

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
              disabled={busy}
              className="h-11 flex-1 rounded-full bg-brand font-bold text-primary-foreground shadow-brand"
            >
              {busy ? "Saving..." : form.id ? "Update Product" : "Save Product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
