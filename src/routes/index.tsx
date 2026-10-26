import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Minus, Plus, Pencil, Trash2, LogOut, Search, Package, AlertTriangle, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { BrandMark } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inventory — Heavic Ventures" },
      { name: "description", content: "Track hair extensions, shampoos, oils and accessories in stock." },
      { property: "og:title", content: "Inventory — Heavic Ventures" },
      { property: "og:description", content: "Track hair extensions, shampoos, oils and accessories in stock." },
    ],
  }),
  component: Dashboard,
});

const CATEGORIES = ["Hair Extensions", "Shampoo", "Conditioner", "Hair Growth Oils", "Cream", "Accessories", "Tools & Equipment"];

type Product = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  low_stock_threshold: number;
};

const cedi = (n: number) => `GH₵ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { session, loading } = useSession();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [editing, setEditing] = useState<Partial<Product> | null>(null);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login", replace: true });
  }, [loading, session, navigate]);

  const { data: products = [] } = useQuery({
    queryKey: ["products", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data.map((p) => ({ ...p, price: Number(p.price) })) as Product[];
    },
  });

  const filtered = useMemo(
    () =>
      products.filter(
        (p) => (cat === "All" || p.category === cat) && p.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [products, cat, search],
  );

  const totalItems = products.reduce((s, p) => s + p.quantity, 0);
  const lowCount = products.filter((p) => p.quantity <= p.low_stock_threshold).length;
  const value = products.reduce((s, p) => s + p.quantity * p.price, 0);

  const refresh = () => qc.invalidateQueries({ queryKey: ["products"] });

  async function adjust(p: Product, delta: number) {
    const q = Math.max(0, p.quantity + delta);
    const { error } = await supabase.from("products").update({ quantity: q, updated_at: new Date().toISOString() }).eq("id", p.id);
    if (error) toast.error(error.message);
    refresh();
  }

  async function remove(p: Product) {
    if (!confirm(`Delete ${p.name}?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) toast.error(error.message);
    else toast.success("Product deleted");
    refresh();
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  if (!session) return <div className="min-h-screen bg-brand" />;

  return (
    <div className="min-h-screen">
      <header className="bg-brand pb-24">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <BrandMark size="sm" />
          <Button variant="ghost" onClick={signOut} className="rounded-full text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground">
            <LogOut className="mr-2 h-4 w-4" /> Log out
          </Button>
        </div>
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="font-heading text-5xl uppercase text-primary-foreground">Inventory</h1>
          <p className="text-accent">Everything associated with hair, all in one place.</p>
        </div>
      </header>

      <main className="mx-auto -mt-16 max-w-6xl px-6 pb-16">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat icon={<Package />} label="Items in stock" value={totalItems.toString()} />
          <Stat icon={<AlertTriangle />} label="Low stock" value={lowCount.toString()} highlight={lowCount > 0} />
          <Stat icon={<Wallet />} label="Stock value" value={cedi(value)} />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-12 rounded-full bg-card pl-11" />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="h-12 rounded-full bg-card sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setEditing({ category: "Accessories", quantity: 0, price: 0, low_stock_threshold: 5 })} className="h-12 rounded-full bg-brand px-6 font-bold shadow-brand">
            <Plus className="mr-1 h-4 w-4" /> Add product
          </Button>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border bg-card">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              {products.length === 0 ? "No products yet. Add your first item to start tracking." : "No products match your search."}
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((p) => {
                const low = p.quantity <= p.low_stock_threshold;
                return (
                  <li key={p.id} className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-bold">{p.name}</span>
                        {low && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">Low</span>}
                      </div>
                      <div className="text-sm text-muted-foreground">{p.category} · {cedi(p.price)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" className="rounded-full" onClick={() => adjust(p, -1)} aria-label="Decrease"><Minus className="h-4 w-4" /></Button>
                      <span className={`w-12 text-center font-heading text-2xl ${low ? "text-primary" : "text-secondary"}`}>{p.quantity}</span>
                      <Button size="icon" variant="outline" className="rounded-full" onClick={() => adjust(p, 1)} aria-label="Increase"><Plus className="h-4 w-4" /></Button>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(p)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(p)} aria-label="Delete" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>

      <ProductDialog product={editing} onClose={() => setEditing(null)} onSaved={refresh} />
    </div>
  );
}

function Stat({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-3xl border bg-card p-5 shadow-brand">
      <div className={`mb-3 inline-flex rounded-full p-2 ${highlight ? "bg-accent text-accent-foreground" : "bg-muted text-primary"}`}>{icon}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="font-heading text-3xl text-secondary">{value}</div>
    </div>
  );
}

function ProductDialog({ product, onClose, onSaved }: { product: Partial<Product> | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Product>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm(product ?? {}), [product]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const name = (form.name ?? "").trim();
    if (!name || name.length > 120) { toast.error("Enter a product name (max 120 characters)"); return; }
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
    if (error) { toast.error(error.message); return; }
    toast.success(form.id ? "Product updated" : "Product added");
    onSaved();
    onClose();
  }

  const set = (k: keyof Product) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl uppercase text-secondary">{form.id ? "Edit product" : "Add product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name ?? ""} onChange={set("name")} placeholder="e.g. Body wave bundle 22”" />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={form.category ?? "Accessories"} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><Label>Quantity</Label><Input type="number" min={0} value={form.quantity ?? 0} onChange={set("quantity")} /></div>
            <div className="space-y-2"><Label>Price (GH₵)</Label><Input type="number" min={0} step="0.01" value={form.price ?? 0} onChange={set("price")} /></div>
            <div className="space-y-2"><Label>Low alert at</Label><Input type="number" min={0} value={form.low_stock_threshold ?? 5} onChange={set("low_stock_threshold")} /></div>
          </div>
          <Button type="submit" disabled={busy} className="h-11 w-full rounded-full bg-brand font-bold">{busy ? "Saving..." : "Save"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
