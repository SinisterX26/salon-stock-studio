import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Package, Receipt, Users, LogOut } from "lucide-react";
import { BrandMark } from "./AuthShell";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";

const sections = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/stock", label: "Stock", icon: Package },
  { to: "/sales", label: "Sales", icon: Receipt },
  { to: "/team", label: "Team", icon: Users },
] as const;

export function SalonShell() {
  const { pathname } = useLocation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const title = sections.find((s) => s.to === pathname)?.label ?? "Dashboard";
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/login", replace: true });
  }
  return <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
    <aside className="bg-brand text-primary-foreground lg:sticky lg:top-0 lg:h-screen">
      <div className="flex items-center justify-between p-6"><BrandMark size="sm" /><Button variant="ghost" size="icon" onClick={signOut} aria-label="Log out" title="Log out" className="lg:hidden"><LogOut /></Button></div>
      <nav aria-label="Main navigation" className="grid grid-cols-4 gap-1 px-3 pb-4 lg:mt-10 lg:grid-cols-1 lg:gap-2">
        {sections.map(({ to, label, icon: Icon }) => <Button key={to} asChild variant="ghost" className={`h-12 px-2 lg:justify-start lg:px-4 ${pathname === to ? "bg-accent text-accent-foreground" : "text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"}`}><Link to={to}><Icon /><span>{label}</span></Link></Button>)}
      </nav>
      <div className="absolute bottom-8 left-6 hidden lg:block"><Button variant="ghost" onClick={signOut} className="text-primary-foreground"><LogOut /> Log out</Button></div>
    </aside>
    <div className="min-w-0">
      <header className="border-b bg-card px-6 py-6 sm:px-10"><p className="mb-1 text-sm font-bold text-primary">Heavic Ventures / Salon management</p><h1 className="font-heading text-4xl uppercase text-secondary">{title}</h1></header>
      <main className="mx-auto max-w-7xl p-6 sm:p-10"><Outlet /></main>
    </div>
  </div>;
}