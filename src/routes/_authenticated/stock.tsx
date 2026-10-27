// @ts-nocheck
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
  const [restockProductId, setRestockProductId] = useState<string | null>(null);\n  const [importOpen, setImportOpen] = useState(false);

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

          {/* CSV Import Button (Admin only) */}
          {isAdmin ? (
            <Button
              variant="outline"
              className="h-12 rounded-full bg-card px-5 font-bold"
              onClick={() => setImportOpen(true)}
            >
              <Package className="mr-1.5 h-4 w-4" /> Import CSV
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

      <InventoryImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImported={refresh} />

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


type ImportedProduct = {
  name: string;
  category: string;
  quantity: number;
  price: number;
  low_stock_threshold: number;
  warnings: string[];
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\\n" || char === "\\r") && !quoted) {
      if (char === "\\r" && text[i + 1] === "\\n") i++;
      row.push(cell.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = []; cell = "";
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  if (quoted) throw new Error("The CSV has an unfinished quoted field.");
  return rows;
}

function InventoryImportDialog({
  open, onClose, onImported,
}: { open: boolean; onClose: () => void; onImported: () => void }) {
  const [rows, setRows] = useState<ImportedProduct[]>([]);
  const [fileName, setFileName] = useState("");
  const [errorText, setErrorText] = useState("");
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState(false);

  useEffect(() => {
    if (!open) { setRows([]); setFileName(""); setErrorText(""); setImported(false); setBusy(false); }
  }, [open]);

  async function readFile(file?: File) {
    setRows([]); setErrorText(""); setImported(false);
    if (!file) return;
    setFileName(file.name);
    try {
      const raw = parseCsv(await file.text());
      if (raw.length < 2) throw new Error("The CSV contains no inventory rows.");
      const headers = raw[0].map((h) => h.toLowerCase().replace(/\\s+/g, " ").trim());
      const nameIndex = headers.findIndex((h) => ["item description", "product name", "name"].includes(h));
      const quantityIndex = headers.findIndex((h) => h === "quantity");
      const priceIndex = headers.findIndex((h) => h.startsWith("unit price") || h === "price");
      if (nameIndex < 0 || quantityIndex < 0 || priceIndex < 0) {
        throw new Error('Required columns not found. Include "Item Description", "Quantity", and "Unit Price (GH₵)" headers.');
      }
      const parsed: ImportedProduct[] = raw.slice(1).map((cells, index) => {
        const name = (cells[nameIndex] ?? "").trim();
        const qtyRaw = (cells[quantityIndex] ?? "").replace(/,/g, "").trim();
        const priceRaw = (cells[priceIndex] ?? "").replace(/[₵GH\\s,]/g, "").trim();
        const warnings: string[] = [];
        if (!name) throw new Error(`Row ${index + 2}: product name is empty.`);
        const quantity = qtyRaw === "" ? 0 : Number(qtyRaw);
        const price = priceRaw === "" ? 0 : Number(priceRaw);
        if (!Number.isFinite(quantity) || quantity < 0 || !Number.isInteger(quantity)) throw new Error(`Row ${index + 2}: quantity must be a non-negative whole number.`);
        if (!Number.isFinite(price) || price < 0) throw new Error(`Row ${index + 2}: unit price must be a non-negative number.`);
        if (qtyRaw === "") warnings.push("Missing quantity set to 0");
        if (priceRaw === "") warnings.push("Missing price set to GH₵0.00");
        return { name: name.slice(0, 120), category: "Accessories", quantity, price, low_stock_threshold: 5, warnings };
      });
      if (parsed.length === 0) throw new Error("No inventory rows were found.");
      setRows(parsed);
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : "Could not read this CSV file.");
    }
  }

  async function importRows() {
    if (!rows.length || busy || imported) return;
    setBusy(true);
    try {
      // Preserve every CSV row, including repeated product names, as a separate catalog record.
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100).map(({ warnings: _warnings, ...product }) => product);
        const { error } = await supabase.from("products").insert(batch);
        if (error) throw new Error(`Import stopped at row ${i + 1}: ${error.message}`);
      }
      setImported(true);
      toast.success(`Imported ${rows.length} inventory rows`);
      onImported();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Inventory import failed");
    } finally { setBusy(false); }
  }

  const warningCount = rows.reduce((total, row) => total + row.warnings.length, 0);
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl uppercase text-secondary">Import Inventory CSV</DialogTitle>
          <DialogDescription>Upload a CSV with Item Description, Quantity, and Unit Price columns. Rows are added as new products; existing items are not overwritten.</DialogDescription>
        </DialogHeader>
        {!imported ? <>
          <div className="space-y-2 rounded-xl border border-dashed p-4">
            <Label htmlFor="inventory-csv">Choose inventory CSV</Label>
            <Input id="inventory-csv" type="file" accept=".csv,text/csv" onChange={(e) => void readFile(e.target.files?.[0])} />
            {fileName ? <p className="text-xs text-muted-foreground">Selected: {fileName}</p> : null}
            <p className="text-xs text-muted-foreground">Missing quantity or price is imported as zero. Duplicate names remain separate rows. Imported category defaults to Accessories and low-stock alert defaults to 5.</p>
          </div>
          {errorText ? <p role="alert" className="text-sm font-medium text-destructive">{errorText}</p> : null}
          {rows.length > 0 ? <>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-muted px-3 py-1 font-semibold">{rows.length} rows ready</span>
              {warningCount > 0 ? <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-900">{warningCount} missing-value warning(s)</span> : null}
            </div>
            <div className="max-h-72 overflow-auto rounded-xl border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-muted"><tr><th className="p-2">Product</th><th className="p-2">Quantity</th><th className="p-2">Unit price</th><th className="p-2">Import notes</th></tr></thead>
                <tbody>{rows.map((row, index) => <tr key={index} className="border-t"><td className="p-2 font-medium">{row.name}</td><td className="p-2">{row.quantity}</td><td className="p-2">{cedi(row.price)}</td><td className="p-2 text-xs text-amber-700">{row.warnings.join(", ") || "—"}</td></tr>)}</tbody>
              </table>
            </div>
          </> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="button" disabled={!rows.length || busy} onClick={() => void importRows()}>{busy ? "Importing…" : `Import ${rows.length || ""} rows`}</Button>
          </div>
        </> : <div className="space-y-4"><p className="font-semibold">Import complete: {rows.length} rows added.</p><p className="text-sm text-muted-foreground">Review the stock list for category assignments and any zero-value records that need correction.</p><div className="flex justify-end"><Button onClick={onClose}>Done</Button></div></div>}
      </DialogContent>
    </Dialog>
  );
}
